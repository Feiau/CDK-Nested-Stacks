
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { baseResources } from './base-resources';
import { appResources } from './app-resources';

export class RootStack extends cdk.Stack {
    public readonly baseResources: baseResources
    public readonly appResources: appResources
  
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
      super(scope, id, props)
  
      this.baseResources = new baseResources(this, 'base-resources')
      const { vpc, applicationSg } = this.baseResources
  
      this.appResources = new appResources(this, 'app-resources', {
        vpc,
        applicationSg,
      })
  
      this.appResources.addDependency(this.baseResources)
    }
  }

  