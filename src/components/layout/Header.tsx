import { useState } from 'react';
import { MagnifyingGlassIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';

interface HeaderProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export default function Header({
  selectedDate,
  onDateChange,
  searchQuery,
  onSearchChange
}: HeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and title */}
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <h1 className="text-xl font-semibold text-gray-900">
                Post-Op Radar
              </h1>
              <p className="text-sm text-gray-500">
                Riverside Surgery Center
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center space-x-4">
            {/* Date selector */}
            <div className="relative">
              <label htmlFor="date-select" className="sr-only">
                Select date
              </label>
              <input
                id="date-select"
                type="date"
                value={selectedDate}
                onChange={(e) => onDateChange(e.target.value)}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              />
            </div>

            {/* Search */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search patients..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                style={{ minWidth: '240px' }}
              />
            </div>

            {/* Settings */}
            <button className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500">
              <span className="sr-only">Settings</span>
              <Cog6ToothIcon className="h-6 w-6" />
            </button>

            {/* Profile menu placeholder */}
            <div className="relative">
              <button className="bg-white rounded-full flex text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                <span className="sr-only">Open user menu</span>
                <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-medium">
                  A
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}