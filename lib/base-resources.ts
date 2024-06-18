import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

export class baseResources extends cdk.NestedStack {   // VPC&SG stack
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