import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as rds from "aws-cdk-lib/aws-rds";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ecsPatterns from "aws-cdk-lib/aws-ecs-patterns";
import * as ssm from "aws-cdk-lib/aws-ssm";
import * as path from "path";

export class InfrastructureStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // =========================================================================
        // 1. Networking (VPC)
        // =========================================================================
        const vpc = new ec2.Vpc(this, "HostelVpc", {
            maxAzs: 2, // Deploy across 2 Availability Zones for high availability
            natGateways: 1, // 1 NAT Gateway keeps costs down for production starts
            subnetConfiguration: [
                {
                    cidrMask: 24,
                    name: "Public",
                    subnetType: ec2.SubnetType.PUBLIC, // For Load Balancers
                },
                {
                    cidrMask: 24,
                    name: "Private",
                    subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS, // For Spring Boot Container
                },
                {
                    cidrMask: 24,
                    name: "Isolated",
                    subnetType: ec2.SubnetType.PRIVATE_ISOLATED, // For the Database
                },
            ],
        });

        // =========================================================================
        // 2. Managed PostgreSQL Database (RDS)
        // =========================================================================
        const dbEngine = rds.DatabaseInstanceEngine.postgres({
            version: rds.PostgresEngineVersion.VER_16, // Stable LTS with robust PostGIS support
        });

        const database = new rds.DatabaseInstance(this, "HostelDatabase", {
            engine: dbEngine,
            vpc,
            vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
            instanceType: ec2.InstanceType.of(
                ec2.InstanceClass.T4G,
                ec2.InstanceSize.MICRO,
            ), // Cost-friendly burstable tier
            allocatedStorage: 20,
            maxAllocatedStorage: 100,
            databaseName: "hostel-booking-db",
            publiclyAccessible: false, // Security best practice: keep the DB isolated
            removalPolicy: cdk.RemovalPolicy.SNAPSHOT, // Don't lose data if stack is destroyed
        });

        // =========================================================================
        // 3. Secrets Injection from SSM Parameter Store
        // =========================================================================
        // This fetches values you manually add to AWS SSM prior to running your pipeline
        const jwtSecret = ssm.StringParameter.fromStringParameterName(
            this,
            "JwtSecret",
            "/hostel/JWT_SECRET",
        );

        // 1. First, fetch them from SSM Parameter Store at the top of your stack
        const vapidPrivateKey = ssm.StringParameter.fromStringParameterName(
            this,
            "VapidPrivKey",
            "/hostel/VAPID_PRIVATE_KEY",
        );
        const cloudinarySecret = ssm.StringParameter.fromStringParameterName(
            this,
            "CloudinarySecret",
            "/hostel/CLOUDINARY_API_SECRET",
        );
        const mailPassword = ssm.StringParameter.fromStringParameterName(
            this,
            "MailPassword",
            "/hostel/MAIL_PASSWORD",
        );

        // For non-sensitive configurations, you can fetch the raw string value directly to use in plain environment text
        const frontendUrl = ssm.StringParameter.valueForStringParameter(
            this,
            "/hostel/FRONTEND_BASE_URL",
        );
        const vapidPublicKey = ssm.StringParameter.valueForStringParameter(
            this,
            "/hostel/VAPID_PUBLIC_KEY",
        );
        const vapidSubject = ssm.StringParameter.valueForStringParameter(
            this,
            "/hostel/VAPID_SUBJECT",
        );
        const cloudinaryName = ssm.StringParameter.valueForStringParameter(
            this,
            "/hostel/CLOUDINARY_CLOUD_NAME",
        );
        const cloudinaryKey = ssm.StringParameter.valueForStringParameter(
            this,
            "/hostel/CLOUDINARY_API_KEY",
        );
        const sweeperRate = ssm.StringParameter.valueForStringParameter(
            this,
            "/hostel/HOSTEL_SWEEPER_RATE",
        );

        // =========================================================================
        // 4. Container Execution & Load Balancing (ECS Fargate)
        // =========================================================================
        const cluster = new ecs.Cluster(this, "HostelCluster", { vpc });

        const fargateService =
            new ecsPatterns.ApplicationLoadBalancedFargateService(
                this,
                "HostelFargateService",
                {
                    cluster,
                    cpu: 512, // 0.5 vCPU
                    memoryLimitMiB: 1024, // 1 GB RAM (perfect for Spring Boot with optimized JVM memory)
                    desiredCount: 1,
                    publicLoadBalancer: true, // Exposed to the public internet
                    taskSubnets: {
                        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
                    },
                    taskImageOptions: {
                        // Points directly to your production multi-stage dockerfile
                        image: ecs.ContainerImage.fromAsset(
                            path.join(__dirname, "../../"),
                            {
                                file: "Dockerfile.prod",
                                exclude: [
                                    "infrastructure", // Prevents the infinite recursive loop!
                                    "node_modules", // Keeps the upload size small
                                    "target", // Ignores old local builds
                                    ".git",
                                ],
                            },
                        ),
                        containerPort: 8080,
                        environment: {
                            SPRING_PROFILES_ACTIVE: "prod",
                            SERVER_PORT: "8080",
                            SPRING_DATASOURCE_URL: `jdbc:postgresql://${database.dbInstanceEndpointAddress}:${database.dbInstanceEndpointPort}/hostel-booking-db?stringtype=unspecified`,
                            SPRING_DATASOURCE_USERNAME: "postgres",
                            // Add plain text environments here:
                            FRONTEND_BASE_URL: frontendUrl,
                            FRONTEND_PASSWORD_SETUP_URL: `/setup-password`,
                            FRONTEND_EMAIL_VERIFICATION_URL: `/verify-email`,
                            VAPID_PUBLIC_KEY: vapidPublicKey,
                            VAPID_SUBJECT: vapidSubject,
                            CLOUDINARY_CLOUD_NAME: cloudinaryName,
                            CLOUDINARY_API_KEY: cloudinaryKey,
                            HOSTEL_SWEEPER_RATE: sweeperRate,
                            MAIL_HOST: "smtp.gmail.com",
                            MAIL_PORT: "465",
                            MAIL_USERNAME: "your-production-email@gmail.com",
                        },
                        secrets: {
                            JWT_SECRET: ecs.Secret.fromSsmParameter(jwtSecret),
                            // Add secure secrets here:
                            VAPID_PRIVATE_KEY:
                                ecs.Secret.fromSsmParameter(vapidPrivateKey),
                            CLOUDINARY_API_SECRET:
                                ecs.Secret.fromSsmParameter(cloudinarySecret),
                            MAIL_PASSWORD:
                                ecs.Secret.fromSsmParameter(mailPassword),
                            // Automatically injects the auto-generated RDS password
                            SPRING_DATASOURCE_PASSWORD:
                                ecs.Secret.fromSecretsManager(database.secret!),
                        },
                    },
                },
            );

        // Automatically allow traffic from the Spring Boot container to your RDS instance
        database.connections.allowFrom(
            fargateService.service,
            ec2.Port.tcp(5432),
        );

        // Configure health checks so the load balancer knows when Spring Boot has warmed up
        fargateService.targetGroup.configureHealthCheck({
            path: "/actuator/health", // Ensure spring-boot-starter-actuator is in your pom.xml
            port: "8080",
            healthyHttpCodes: "200",
            interval: cdk.Duration.seconds(30),
            timeout: cdk.Duration.seconds(5),
        });
    }
}
