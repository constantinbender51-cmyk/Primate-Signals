import React from 'react';
import { Link } from 'react-router-dom';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="py-20 px-4 bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Human Intelligence, AI Experience
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-10">
            Connect with real people who power our AI chatbots. Get authentic, human responses with the convenience of AI.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/signup/user" className="px-8 py-3 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 transition">
              Sign Up as User
            </Link>
            <Link to="/signup/ai-provider" className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition">
              Become an AI Provider
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">How It Works</h2>
          
          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <h3 className="text-2xl font-bold text-blue-600 mb-4">For AI Providers</h3>
              <div className="space-y-6">
                <div className="flex items-start">
                  <div className="flex-shrink-0 bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center font-bold mr-4">1</div>
                  <div>
                    <h4 className="font-bold text-lg mb-2">Verify Your Identity</h4>
                    <p className="text-gray-600">Complete ID verification to become a trusted AI provider</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex-shrink-0 bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center font-bold mr-4">2</div>
                  <div>
                    <h4 className="font-bold text-lg mb-2">Set Up Your Profile</h4>
                    <p className="text-gray-600">Create your AI persona and specify your expertise areas</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex-shrink-0 bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center font-bold mr-4">3</div>
                  <div>
                    <h4 className="font-bold text-lg mb-2">Start Earning</h4>
                    <p className="text-gray-600">Get paid for each chat session you complete as an AI provider</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-2xl font-bold text-emerald-600 mb-4">For Users</h3>
              <div className="space-y-6">
                <div className="flex items-start">
                  <div className="flex-shrink-0 bg-emerald-100 text-emerald-600 rounded-full w-8 h-8 flex items-center justify-center font-bold mr-4">1</div>
                  <div>
                    <h4 className="font-bold text-lg mb-2">Choose a Plan</h4>
                    <p className="text-gray-600">Select a subscription plan that fits your needs</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex-shrink-0 bg-emerald-100 text-emerald-600 rounded-full w-8 h-8 flex items-center justify-center font-bold mr-4">2</div>
                  <div>
                    <h4 className="font-bold text-lg mb-2">Find the Right AI</h4>
                    <p className="text-gray-600">Browse and select AI providers based on expertise and ratings</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex-shrink-0 bg-emerald-100 text-emerald-600 rounded-full w-8 h-8 flex items-center justify-center font-bold mr-4">3</div>
                  <div>
                    <h4 className="font-bold text-lg mb-2">Chat & Get Answers</h4>
                    <p className="text-gray-600">Get authentic, thoughtful responses from real human experts</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Value Proposition */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Why Choose Human AI?</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <div className="text-3xl mb-4">🧠</div>
              <h3 className="text-xl font-bold mb-2">Authentic Intelligence</h3>
              <p className="text-gray-600">No generic AI answers - get thoughtful, human responses tailored to your needs</p>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <div className="text-3xl mb-4">🔍</div>
              <h3 className="text-xl font-bold mb-2">Specialized Knowledge</h3>
              <p className="text-gray-600">Connect with experts in specific fields who can provide deep domain knowledge</p>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <div className="text-3xl mb-4">🔒</div>
              <h3 className="text-xl font-bold mb-2">Privacy Protected</h3>
              <p className="text-gray-600">Your identity remains anonymous while interacting with human AI providers</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}