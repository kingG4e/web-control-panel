import React from 'react';

function Dashboard() {
  const stats = [
    { title: 'Virtual Hosts', value: '12', icon: '🌐' },
    { title: 'DNS Records', value: '45', icon: '🔍' },
    { title: 'Email Accounts', value: '28', icon: '📧' },
    { title: 'Databases', value: '8', icon: '💾' },
    { title: 'SSL Certificates', value: '15', icon: '🔒' },
    { title: 'FTP Users', value: '20', icon: '📁' },
  ];

  const systemInfo = {
    cpu: '45%',
    memory: '60%',
    disk: '75%',
    uptime: '15 days',
  };

  return (
    <div className="container mx-auto px-4">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">{stat.title}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
              <span className="text-3xl">{stat.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* System Resources */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-bold mb-4">System Resources</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(systemInfo).map(([key, value]) => (
            <div key={key} className="border rounded-lg p-4">
              <p className="text-gray-500 capitalize">{key}</p>
              <div className="flex items-center mt-2">
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: value }}
                  ></div>
                </div>
                <span className="ml-2 text-sm font-medium">{value}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold mb-4">Recent Activity</h2>
        <div className="space-y-4">
          {[
            { action: 'Virtual Host Created', domain: 'example.com', time: '5 minutes ago' },
            { action: 'DNS Record Updated', domain: 'test.com', time: '1 hour ago' },
            { action: 'Database Backup', domain: 'db_main', time: '3 hours ago' },
            { action: 'SSL Certificate Renewed', domain: 'secure.com', time: '1 day ago' },
          ].map((activity, index) => (
            <div key={index} className="flex items-center justify-between border-b pb-4">
              <div>
                <p className="font-medium">{activity.action}</p>
                <p className="text-sm text-gray-500">{activity.domain}</p>
              </div>
              <span className="text-sm text-gray-500">{activity.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Dashboard; 