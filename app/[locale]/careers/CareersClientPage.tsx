'use client';

import React from "react";
import { MapPin, Briefcase } from "lucide-react";
import Image from "next/image";
import { Link } from '@/i18n/navigation';

// Import reusable components
import Header from "@/components/Header";
import Footer from "@/components/Footer";
type JobType = any; // Job type

// Dark Hero Section Component
function DarkHero() {
  return (
    <div className="relative h-96 bg-slate-900 flex items-center justify-center text-white text-center px-4 overflow-hidden">
      <div className="absolute inset-0 z-0 opacity-20">
        <Image
          src="/about.png" // Using a relevant existing image
          alt="Careers at Egypt Excursions Online"
          layout="fill"
          objectFit="cover"
        />
      </div>
      <div className="relative z-10">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight">
          Your Best Travel Buddy
        </h1>
        <p className="mt-4 text-lg sm:text-xl max-w-2xl mx-auto opacity-80">
          Discover hidden gems and unforgettable experiences with our expert guidance.
        </p>
      </div>
    </div>
  );
}

interface CareersClientPageProps {
    jobOpenings: JobType[];
}

export default function CareersClientPage({ jobOpenings }: CareersClientPageProps) {
  return (
    <div className="bg-white text-slate-800 min-h-screen flex flex-col">
      <DarkHero />
      <Header />

      <main className="container mx-auto px-4 py-16 flex-grow">
        <div className="max-w-4xl mx-auto">
          <section className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 mb-4">
              Join Our Team
            </h1>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Are you passionate about travel and creating unforgettable experiences? We're a team of dedicated experts committed to providing the best of Egypt to the world.
            </p>
          </section>
          
          <section className="mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-6 text-center md:text-start">
              Current Openings
            </h2>
            <div className="space-y-6">
              {jobOpenings.length > 0 ? (
                jobOpenings.map((job) => (
                  <div 
                    key={job._id}
                    className="bg-slate-50 p-6 rounded-lg shadow-sm hover:shadow-lg transition-shadow duration-300"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                      <div>
                        <h3 className="text-xl font-semibold text-slate-900">{job.title}</h3>
                        <div className="flex items-center gap-4 text-sm text-slate-600 mt-1">
                          <div className="flex items-center gap-1">
                            <MapPin size={16} />
                            <span>{job.location}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Briefcase size={16} />
                            <span>{job.type}</span>
                          </div>
                        </div>
                      </div>
                      <Link
                        href={job.link || `/careers/${job._id}`}
                        className="inline-flex justify-center items-center h-10 px-6 bg-red-600 text-white rounded-md font-semibold hover:bg-red-700 transition-colors flex-shrink-0"
                      >
                        Apply Now
                      </Link>
                    </div>
                    <p className="text-slate-700 text-sm leading-relaxed">
                      {job.description}
                    </p>
                  </div>
                ))
              ) : (
                <div className="text-center py-10 bg-slate-50 rounded-lg">
                    <p className="text-slate-600">There are no open positions at the moment. Please check back later!</p>
                </div>
              )}
            </div>
          </section>

          <section className="text-center mt-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-4">
              Don't see a role for you?
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-6">
              We're always looking for talented people to join our team. Send us your resume and tell us how you can help us grow.
            </p>
            <Link 
              href="/contact" 
              className="inline-block px-8 py-3 bg-slate-800 text-white rounded-md font-semibold hover:bg-red-600 transition-colors"
            >
              Get in Touch
            </Link>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}