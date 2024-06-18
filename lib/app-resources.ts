import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as iam from 'aws-cdk-lib/aws-iam'

export interface appResourcesProps extends cdk.NestedStackProps {
    readonly vpc: ec2.IVpc;
    readonly applicationSg: ec2.ISecurityGroup;
  }

export class appResources extends cdk.NestedStack {   // VPC/SG stack
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