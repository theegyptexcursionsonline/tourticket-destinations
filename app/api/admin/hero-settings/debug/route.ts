// app/api/admin/hero-settings/debug/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth/adminAuth';
import dbConnect from '@/lib/dbConnect';
import HeroSettings from '@/lib/models/HeroSettings';

export async function GET(request: NextRequest) {
  const auth = await requireAdminAuth(request, { permissions: ['manageContent'] });
  if (auth instanceof NextResponse) return auth;
  try {
    await dbConnect();
    
    // Get all settings from database
    const allSettings = await HeroSettings.find({}).lean();
    const activeSettings = await HeroSettings.findOne({ isActive: true }).lean();
    
    // Test what the public API would return
    const publicApiResponse = await fetch('http://localhost:3003/api/hero-settings');
    const publicApiData = await publicApiResponse.json();
    
    const htmlResponse = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Hero Settings Debug</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 1400px;
            margin: 20px auto;
            padding: 20px;
            background: #0F172A;
            color: #F1F5F9;
          }
          .container {
            background: #1E293B;
            border-radius: 12px;
            padding: 30px;
            margin-bottom: 20px;
            border: 1px solid #334155;
          }
          h1 {
            color: #60A5FA;
            margin: 0 0 20px 0;
          }
          h2 {
            color: #34D399;
            margin: 20px 0 12px 0;
            font-size: 18px;
          }
          pre {
            background: #0F172A;
            padding: 16px;
            border-radius: 8px;
            overflow-x: auto;
            border: 1px solid #334155;
            font-size: 13px;
            line-height: 1.6;
          }
          .warning {
            background: #7C2D12;
            border-left: 4px solid #F97316;
            padding: 16px;
            margin: 20px 0;
            border-radius: 4px;
          }
          .info {
            background: #1E3A8A;
            border-left: 4px solid #3B82F6;
            padding: 16px;
            margin: 20px 0;
            border-radius: 4px;
          }
          .success {
            background: #14532D;
            border-left: 4px solid #22C55E;
            padding: 16px;
            margin: 20px 0;
            border-radius: 4px;
          }
          .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
            gap: 20px;
            margin: 20px 0;
          }
          .card {
            background: #0F172A;
            border: 1px solid #334155;
            border-radius: 8px;
            padding: 20px;
          }
          .card h3 {
            color: #F59E0B;
            margin: 0 0 12px 0;
            font-size: 16px;
          }
          .highlight {
            background: #FEF3C7;
            color: #92400E;
            padding: 2px 8px;
            border-radius: 4px;
            font-weight: 600;
          }
          .button {
            display: inline-block;
            background: #3B82F6;
            color: white;
            padding: 10px 20px;
            border-radius: 6px;
            text-decoration: none;
            margin: 5px;
            font-weight: 600;
          }
          .button:hover {
            background: #2563EB;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 16px 0;
          }
          th, td {
            text-align: left;
            padding: 12px;
            border-bottom: 1px solid #334155;
          }
          th {
            background: #0F172A;
            color: #60A5FA;
            font-weight: 600;
          }
          .badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
          }
          .badge-active {
            background: #22C55E;
            color: white;
          }
          .badge-inactive {
            background: #64748B;
            color: white;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🔍 Hero Settings Debug Panel</h1>
          
          ${!activeSettings ? `
            <div class="warning">
              <strong>⚠️ NO ACTIVE SETTINGS FOUND IN DATABASE!</strong><br>
              This is why you're seeing hardcoded defaults. The API returns fallback values when no active settings exist.
            </div>
          ` : `
            <div class="success">
              <strong>✅ Active Settings Found</strong><br>
              Found active settings in database with ID: ${activeSettings._id}
            </div>
          `}

          <div class="info">
            <strong>📊 Database Count:</strong> ${allSettings.length} total record(s)<br>
            <strong>🎯 Active Record:</strong> ${activeSettings ? 'YES' : 'NO'}
          </div>
        </div>

        <div class="container">
          <h2>🗄️ All Database Records</h2>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Status</th>
                <th>Main Title</th>
                <th>Highlight</th>
                <th>Has Subtitle?</th>
              </tr>
            </thead>
            <tbody>
              ${allSettings.map(setting => `
                <tr>
                  <td><code>${setting._id}</code></td>
                  <td>
                    <span class="badge ${setting.isActive ? 'badge-active' : 'badge-inactive'}">
                      ${setting.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>${setting.title?.main || 'N/A'}</td>
                  <td class="highlight">${setting.title?.highlight || 'N/A'}</td>
                  <td>${'subtitle' in (setting.title || {}) ? '❌ YES (BAD)' : '✅ NO (GOOD)'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="grid">
          <div class="card">
            <h3>📍 Active Database Settings</h3>
            <pre>${JSON.stringify(activeSettings?.title || null, null, 2)}</pre>
          </div>
          
          <div class="card">
            <h3>🌐 Public API Response</h3>
            <pre>${JSON.stringify(publicApiData?.data?.title || null, null, 2)}</pre>
          </div>
        </div>

        <div class="container">
          <h2>🔧 Full Database Record</h2>
          <pre>${JSON.stringify(activeSettings, null, 2)}</pre>
        </div>

        <div class="container">
          <h2>🌐 Full Public API Response</h2>
          <pre>${JSON.stringify(publicApiData, null, 2)}</pre>
        </div>

        <div class="container">
          <h2>💡 What's Happening?</h2>
          ${!activeSettings ? `
            <div class="warning">
              <strong>Issue Found:</strong> No active settings in database!<br><br>
              The public API (<code>/api/hero-settings</code>) is returning hardcoded defaults because no active settings exist in the database.<br><br>
              <strong>Solution:</strong> Go to the admin panel and click "Save Changes" to create an active settings record.
            </div>
          ` : `
            <div class="success">
              <strong>Database has active settings!</strong><br><br>
              The frontend should be using these values. If you're still seeing "Incredible", try:<br>
              1. Hard refresh the browser (Cmd+Shift+R or Ctrl+Shift+R)<br>
              2. Clear browser cache<br>
              3. Check if the frontend is fetching from the correct API endpoint
            </div>
          `}
        </div>

        <div style="margin-top: 30px; text-align: center;">
          <a href="/" class="button">View Homepage</a>
          <a href="/admin/hero-settings" class="button">Admin Settings</a>
          <a href="/api/hero-settings" class="button">View Public API</a>
          <a href="/api/admin/hero-settings/fix" class="button">Run Fix Again</a>
        </div>
      </body>
      </html>
    `;
    
    return new NextResponse(htmlResponse, {
      headers: {
        'Content-Type': 'text/html',
      },
    });
    
  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}