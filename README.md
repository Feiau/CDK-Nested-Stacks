# Topics
1. Referencing resources
   - Referencing resources in a different stack
     - Demo
     - Dependency deadlocks
   - Referencing resources in your AWS account
     - Workaround: SSM parameter 
     - ACM demo

2. Nested Stack (Cross references between parent stack and nested stacks)           <<<<<<
3. Customizing constructs
   - Using escape hatches
   - Un-escape hatches
   - Raw overrides
   - Custom resources

## Nested Stack
Same with CloudFormation, `Nested Stacks` are stacks created as part of other stacks. You create a nested stack within another stack by using the AWS::CloudFormation::Stack resource.

### When to Use Nested Stacks
- As your infrastructure grows, you’re continually describing the same set of resources in different templates. Instead of repeatedly adding them to each of your templates, consider using nested stacks.
With nested stacks, you can simply create a separate template for the resources that you want to reuse and then save that template in a S3 bucket. Whenever you want to add those resources in another template, use the AWS::CloudFormation::Stack resource to specify the S3 URL of the nested template.

- When you’re deciding to use nested stacks, consider how much customization you need to do. The more customization each resource requires the less beneficial nested templates become. However, if you can easily reuse a template pattern without too much customization, you can use a nested stack.

### Benefit of Nested Stacks
- Workarounds for hitting CloudFormation quotas: 200 Mappings, 200 parameters and 500 resources. (No matter how many resources in Nested stack. The Nested stack itself just count as one in parent stack.)
- Workarounds for hitting the maximum size of CFN tempalte, (51,200 bytes/1 MB). 
- If you want to conditionally create a resource based on the Output of a Custom Resource.

### How to create Nested Stacks in CDK
- Pass the parent stack as the first parameter (scope) when instantiating the nested stack.
- The scope of a nested stack must be a Stack or NestedStack construct.
- Defining constructs in a nested stack works exactly the same as in an ordinary stack.
- At synthesis time, the nested stack is synthesized to its own AWS CloudFormation template, which is uploaded to the AWS CDK staging bucket at deployment. 
- Nested stacks are bound to their parent stack and are not treated as independent deployment artifacts. They aren't listed by cdk list, and they can't be deployed by cdk deploy.

### Demo
- Deploying basic networking resources, VPC and SG in Nested stack. 
- Pass them into application stack to deploy EC2 instance and application. 
- With the basic networking Nested stack, you can deploy multiple applications with the same networking configurations, instead of defining the VPC and SG in each of application stacks. 

1. lib/base-resources.ts
```typescript
...
export class baseResources extends cdk.NestedStack {   // NestedStack
    public readonly vpc: ec2.IVpc;
    public readonly applicationSg: ec2.ISecurityGroup;

    constructor(scope: Construct, id: string, props?: cdk.NestedStackProps) {
        super(scope, id, props);
        this.vpc = new ec2.Vpc(this, 'app-vpc', {
            ipAddresses: ec2.IpAddresses.cidr('10.0.0.0/20'),
            natGateways: 0,
            maxAzs: 2,
            enableDnsHostnames: true,
            enableDnsSupport: true,
            subnetConfiguration: [
                {
                    cidrMask: 22,
                    name: 'public',
                    subnetType: ec2.SubnetType.PUBLIC,
                },
                {
                    cidrMask: 22,
                    name: 'private',
                    subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
                },
            ],
        })

        this.applicationSg = new ec2.SecurityGroup(this, 'application-sg', {
            vpc: this.vpc,
            securityGroupName: 'application-sg',
        })

        this.applicationSg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80))
    }
}
```

2. lib/app-resources.ts
```typescript
...
export interface appResourcesProps extends cdk.NestedStackProps {
  readonly vpc: ec2.IVpc;
  readonly applicationSg: ec2.ISecurityGroup;
}

export class appResources extends cdk.NestedStack {   // EC2 instance
  constructor(scope: Construct, id: string, props: appResourcesProps) {
    super(scope, id, props);
    // The EC2 instance using Amazon Linux 2
    const instance = new ec2.Instance(this, 'simple-server', {
      vpc: props.vpc,
      instanceName: 'simple-server',
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T2,
        ec2.InstanceSize.MICRO
      ),
      machineImage: ec2.MachineImage.latestAmazonLinux2(),
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      securityGroup: props.applicationSg,
    })

    // Display a simple webpage
    instance.addUserData(
      'yum install -y httpd',
      'systemctl start httpd',
      'systemctl enable httpd',
      'echo "<h1>Hello World from $(hostname -f)</h1>" > /var/www/html/index.html'
    )

    // Add the policy to access EC2 without SSH
    instance.role.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore')
    )
  }
}
```

3. lib/root-stack.ts
```typescript
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { baseResources } from './base-resources';
import { appResources } from './app-resources';

export class RootStack extends cdk.Stack {
    public readonly baseResources: baseResources
    public readonly appResources: appResources
  
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
      super(scope, id, props)
  
      this.baseResources = new baseResources(this, 'base-resources')  // Pass the parent stack as the first parameter (scope) when instantiating the nested stack.
      const { vpc, applicationSg } = this.baseResources
  
      this.appResources = new appResources(this, 'app-resources', {
        vpc,
        applicationSg,
      })
  
      this.appResources.addDependency(this.baseResources)
    }
  }  
```

4. bin/nested_stack.ts
```typescript
#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { RootStack } from '../lib/root-stack';

const env = { account: process.env.CDK_DEFAULT_ACCOUNT, region: 'us-west-2' }

const app = new cdk.App();
new RootStack(app, 'root-stack', {
  env: env,
});
```

### Sample in Python: 
Reference: https://quip-amazon.com/InixAY79fEZ3/Using-Nested-Stacks-in-CDK
