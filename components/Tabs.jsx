import { useState } from 'react';

export default function Tabs({ tabs, defaultTab = 0 }) {
  const [activeTab, setActiveTab] = useState(defaultTab);

  return (
    <div className="w-full">
      <div className="tabs border-b border-gray-200">
        {tabs.map((tab, index) => (
          <div
            key={index}
            onClick={() => setActiveTab(index)}
            className={`tab ${
              activeTab === index
                ? 'active border-b-2 border-primary-500 text-primary-600 font-semibold'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </div>
        ))}
      </div>
      <div className="py-4">
        {tabs.map((tab, index) => (
          <div
            key={index}
            className={`tab-content ${activeTab === index ? 'active' : 'hidden'}`}
          >
            {tab.content}
          </div>
        ))}
      </div>
    </div>
  );
}