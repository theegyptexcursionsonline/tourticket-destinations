// app/careers/page.tsx
import React from "react";
import { Metadata } from "next";
import CareersClientPage from "./CareersClientPage";
import dbConnect from "@/lib/dbConnect";
import Job from "@/lib/models/Job";
type JobType = any;
import { getTenantFromRequest, getTenantPublicConfig } from "@/lib/tenant";

// Enable ISR with 60 second revalidation for instant page loads
export const revalidate = 60;

// Generate dynamic metadata based on tenant
export async function generateMetadata(): Promise<Metadata> {
  try {
    const tenantId = await getTenantFromRequest();
    const tenant = await getTenantPublicConfig(tenantId);
    
    if (tenant) {
      return {
        title: `Careers - Join Our Team | ${tenant.name}`,
        description: `Explore exciting career opportunities at ${tenant.name}. Join our team and help create unforgettable travel experiences.`,
        openGraph: {
          title: `Careers - Join Our Team | ${tenant.name}`,
          description: `Explore exciting career opportunities at ${tenant.name}.`,
          type: 'website',
          siteName: tenant.name,
          images: [tenant.seo.ogImage],
        },
      };
    }
  } catch (error) {
    console.error('Error generating careers page metadata:', error);
  }
  
  return {
    title: 'Careers - Join Our Team',
    description: 'Explore exciting career opportunities. Join our team and help create unforgettable travel experiences.',
  };
}

async function getJobs(): Promise<JobType[]> {
    await dbConnect();
    try {
        const jobs = await Job.find({ isActive: true }).sort({ createdAt: -1 }).lean();
        return JSON.parse(JSON.stringify(jobs));
    } catch (error) {
        console.error("Failed to fetch job openings:", error);
        return [];
    }
}

export default async function CareersPage() {
    const jobOpenings = await getJobs();
    return <CareersClientPage jobOpenings={jobOpenings} />;
}