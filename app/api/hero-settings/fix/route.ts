// app/api/admin/hero-settings/fix/route.ts
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import HeroSettings from '@/lib/models/HeroSettings';

export async function GET() {
  try {
    await dbConnect();
    
    // Get all hero settings BEFORE fixes
    const allSettings = await HeroSettings.find({});
    
    let fixedCount = 0;
    const fixes: string[] = [];
    const databaseRecords: any[] = [];
    
    for (const setting of allSettings) {
      let needsUpdate = false;
      const updates: any = {};
      
      // Store BEFORE state
      const beforeState = {
        _id: setting._id,
        title: JSON.parse(JSON.stringify(setting.title)),
        hasSubtitle: setting.title && 'subtitle' in setting.title
      };
      
      // Check if subtitle exists and remove it
      if (setting.title && 'subtitle' in setting.title) {
        updates['title.subtitle'] = '';
        needsUpdate = true;
        fixes.push(`Removed subtitle field from settings ID: ${setting._id}`);
      }
      
      // Ensure title structure is correct
      if (setting.title) {
        if (!setting.title.main) {
          updates['title.main'] = 'Explore Egypt\'s Pyramids & Nile';
          needsUpdate = true;
          fixes.push(`Added default main title to settings ID: ${setting._id}`);
        }
        
        if (!setting.title.highlight) {
          updates['title.highlight'] = 'Incredible';
          needsUpdate = true;
          fixes.push(`Added default highlight to settings ID: ${setting._id}`);
        }
      }
      
      // Apply updates if needed
      if (needsUpdate) {
        if (Object.keys(updates).some(key => key.includes('subtitle'))) {
          await HeroSettings.updateOne(
            { _id: setting._id },
            { $unset: { 'title.subtitle': '' } }
          );
        }
        
        const setUpdates: any = {};
        Object.keys(updates).forEach(key => {
          if (!key.includes('subtitle')) {
            setUpdates[key] = updates[key];
          }
        });
        
        if (Object.keys(setUpdates).length > 0) {
          await HeroSettings.updateOne(
            { _id: setting._id },
            { $set: setUpdates }
          );
        }
        
        fixedCount++;
      }
      
      // Get AFTER state
      const afterSetting = await HeroSettings.findById(setting._id);
      const afterState = {
        _id: afterSetting?._id,
        title: afterSetting?.title ? JSON.parse(JSON.stringify(afterSetting.title)) : null,
        hasSubtitle: afterSetting?.title && 'subtitle' in afterSetting.title
      };
      
      databaseRecords.push({
        before: beforeState,
        after: afterState,
        wasModified: needsUpdate
      });
    }
    
    // Get final state of all records
    const finalSettings = await HeroSettings.find({});
    
    // Return HTML response
    const htmlResponse = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Hero Settings Fixed</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            max-width: 1200px;
            margin: 50px auto;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
          }
          .container {
            background: white;
            border-radius: 12px;
            padding: 40px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
          }
          h1 {
            color: #4F46E5;
            margin-bottom: 10px;
            display: flex;
            align-items: center;
            gap: 12px;
          }
          .icon {
            font-size: 36px;
          }
          .success {
            background: #D1FAE5;
            border-left: 4px solid #10B981;
            padding: 16px;
            margin: 20px 0;
            border-radius: 8px;
          }
          .success h2 {
            color: #047857;
            margin: 0 0 8px 0;
            font-size: 18px;
          }
          .success p {
            color: #065F46;
            margin: 0;
          }
          .fixes {
            background: #F3F4F6;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
          }
          .fixes h3 {
            color: #374151;
            margin: 0 0 12px 0;
            font-size: 16px;
          }
          .fix-item {
            background: white;
            padding: 12px;
            margin: 8px 0;
            border-radius: 6px;
            border-left: 3px solid #6366F1;
            font-size: 14px;
            color: #4B5563;
          }
          .no-fixes {
            color: #6B7280;
            font-style: italic;
          }
          .actions {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 2px solid #E5E7EB;
          }
          .button {
            display: inline-block;
            background: #4F46E5;
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 600;
            margin-right: 12px;
            transition: all 0.2s;
          }
          .button:hover {
            background: #4338CA;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(79, 70, 229, 0.4);
          }
          .button-secondary {
            background: #6B7280;
          }
          .button-secondary:hover {
            background: #4B5563;
          }
          .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
            margin: 20px 0;
          }
          .stat-card {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
          }
          .stat-number {
            font-size: 32px;
            font-weight: bold;
            margin-bottom: 4px;
          }
          .stat-label {
            font-size: 14px;
            opacity: 0.9;
          }
          .database-view {
            background: #1F2937;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
            color: #F9FAFB;
          }
          .database-view h3 {
            color: #60A5FA;
            margin: 0 0 16px 0;
            font-size: 18px;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .record {
            background: #374151;
            border-radius: 6px;
            padding: 16px;
            margin: 12px 0;
            border-left: 4px solid #10B981;
          }
          .record.modified {
            border-left-color: #F59E0B;
          }
          .record-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
            padding-bottom: 8px;
            border-bottom: 1px solid #4B5563;
          }
          .record-id {
            font-family: 'Courier New', monospace;
            color: #93C5FD;
            font-size: 12px;
          }
          .record-badge {
            background: #10B981;
            color: white;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 600;
          }
          .record-badge.modified {
            background: #F59E0B;
          }
          .record-content {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
          }
          .before-after {
            background: #4B5563;
            padding: 12px;
            border-radius: 4px;
          }
          .before-after h4 {
            color: #9CA3AF;
            font-size: 12px;
            margin: 0 0 8px 0;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .json-view {
            font-family: 'Courier New', monospace;
            font-size: 13px;
            line-height: 1.6;
            color: #D1D5DB;
          }
          .json-key {
            color: #60A5FA;
          }
          .json-string {
            color: #34D399;
          }
          .json-boolean {
            color: #F472B6;
          }
          .json-null {
            color: #94A3B8;
            font-style: italic;
          }
          .highlight-removed {
            background: #7F1D1D;
            color: #FCA5A5;
            padding: 2px 6px;
            border-radius: 3px;
          }
          .current-state {
            background: #EFF6FF;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
          }
          .current-state h3 {
            color: #1E40AF;
            margin: 0 0 16px 0;
            font-size: 18px;
          }
          .current-record {
            background: white;
            border: 2px solid #BFDBFE;
            border-radius: 6px;
            padding: 16px;
            margin: 12px 0;
          }
          .current-record pre {
            margin: 0;
            font-family: 'Courier New', monospace;
            font-size: 13px;
            line-height: 1.6;
            color: #1F2937;
            overflow-x: auto;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>
            <span class="icon">✅</span>
            Hero Settings Fix Complete
          </h1>
          
          <div class="success">
            <h2>✨ Database Migration Successful</h2>
            <p>Your hero settings have been updated to the latest structure.</p>
          </div>

          <div class="stats">
            <div class="stat-card">
              <div class="stat-number">${allSettings.length}</div>
              <div class="stat-label">Total Settings</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">${fixedCount}</div>
              <div class="stat-label">Fixed Records</div>
            </div>
          </div>

          <div class="fixes">
            <h3>📋 Changes Applied:</h3>
            ${fixes.length > 0 
              ? fixes.map(fix => `<div class="fix-item">✓ ${fix}</div>`).join('')
              : '<p class="no-fixes">No fixes needed - your database is already up to date!</p>'
            }
          </div>

          <div class="database-view">
            <h3>
              <span>🗄️</span>
              Database Changes (Before → After)
            </h3>
            ${databaseRecords.map(record => `
              <div class="record ${record.wasModified ? 'modified' : ''}">
                <div class="record-header">
                  <span class="record-id">ID: ${record.before._id}</span>
                  <span class="record-badge ${record.wasModified ? 'modified' : ''}">
                    ${record.wasModified ? 'MODIFIED' : 'NO CHANGE'}
                  </span>
                </div>
                <div class="record-content">
                  <div class="before-after">
                    <h4>Before Fix</h4>
                    <div class="json-view">
                      {<br>
                      &nbsp;&nbsp;<span class="json-key">"main"</span>: <span class="json-string">"${record.before.title?.main || 'null'}"</span>,<br>
                      &nbsp;&nbsp;<span class="json-key">"highlight"</span>: <span class="json-string">"${record.before.title?.highlight || 'null'}"</span>${record.before.hasSubtitle ? `,<br>&nbsp;&nbsp;<span class="json-key highlight-removed">"subtitle"</span>: <span class="json-string highlight-removed">"${record.before.title?.subtitle || ''}"</span>` : ''}<br>
                      }
                    </div>
                  </div>
                  <div class="before-after">
                    <h4>After Fix</h4>
                    <div class="json-view">
                      {<br>
                      &nbsp;&nbsp;<span class="json-key">"main"</span>: <span class="json-string">"${record.after.title?.main || 'null'}"</span>,<br>
                      &nbsp;&nbsp;<span class="json-key">"highlight"</span>: <span class="json-string">"${record.after.title?.highlight || 'null'}"</span><br>
                      }
                    </div>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>

          <div class="current-state">
            <h3>📊 Current Database State</h3>
            ${finalSettings.map((setting, index) => `
              <div class="current-record">
                <strong style="color: #1E40AF;">Record ${index + 1}</strong>
                <pre>${JSON.stringify({
                  _id: setting._id,
                  title: setting.title,
                  isActive: setting.isActive,
                  backgroundImagesCount: setting.backgroundImages?.length || 0
                }, null, 2)}</pre>
              </div>
            `).join('')}
          </div>

          <div class="actions">
            <a href="/" class="button">View Homepage</a>
            <a href="/admin/hero-settings" class="button">Admin Settings</a>
            <a href="/api/admin/hero-settings/fix" class="button button-secondary">Run Fix Again</a>
          </div>
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
    console.error('Fix error:', error);
    
    const errorHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Fix Failed</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 800px;
            margin: 50px auto;
            padding: 20px;
            background: #FEE2E2;
          }
          .container {
            background: white;
            border-radius: 12px;
            padding: 40px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          }
          h1 {
            color: #DC2626;
            display: flex;
            align-items: center;
            gap: 12px;
          }
          .error {
            background: #FEE2E2;
            border-left: 4px solid #DC2626;
            padding: 16px;
            margin: 20px 0;
            border-radius: 8px;
            color: #991B1B;
          }
          pre {
            background: #F3F4F6;
            padding: 12px;
            border-radius: 6px;
            overflow-x: auto;
            font-size: 12px;
          }
          .button {
            display: inline-block;
            background: #DC2626;
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 600;
            margin-top: 20px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>
            <span style="font-size: 36px;">❌</span>
            Fix Failed
          </h1>
          <div class="error">
            <strong>Error:</strong> ${error instanceof Error ? error.message : 'Unknown error occurred'}
            <pre>${error instanceof Error ? error.stack : ''}</pre>
          </div>
          <a href="/admin/hero-settings" class="button">Go to Admin Panel</a>
        </div>
      </body>
      </html>
    `;
    
    return new NextResponse(errorHtml, {
      status: 500,
      headers: {
        'Content-Type': 'text/html',
      },
    });
  }
}