// app/admin/seed/page.tsx
'use client';

import { useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { AlertTriangle, FileJson, Loader2, CheckCircle, XCircle } from 'lucide-react';
import withAuth from '@/components/admin/withAuth';

type SeedReport = {
  wipedData: boolean;
  destinationsCreated: number;
  categoriesCreated: number;
  toursCreated: number;
  errors: string[];
};

function SeedPage() {
  const [jsonFile, setJsonFile] = useState<File | null>(null);
  const [wipeData, setWipeData] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [report, setReport] = useState<SeedReport | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sampleJson = `{
  "destinations": [
    { "name": "Amsterdam", "image": "/images/dest/amsterdam.jpg" },
    { "name": "Egypt", "image": "/images/dest/egypt.jpg" }
  ],
  "categories": [
    { "name": "Canal Cruises" },
    { "name": "History Buffs" },
    { "name": "Day Trips" }
  ],
  "tours": [
    {
      "title": "1-Hour Amsterdam Canal Cruise",
      "description": "Experience Amsterdam from a unique perspective.",
      "duration": "60 minutes",
      "discountPrice": 15.50,
      "originalPrice": 20,
      "tags": ["Online only deal", "-25%"],
      "destinationName": "Amsterdam",
      "categoryNames": ["Canal Cruises"]
    }
  ]
}`;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/json') {
      setJsonFile(file);
      setReport(null); // Reset report on new file selection
    } else {
      toast.error('Please select a valid JSON file.');
      setJsonFile(null);
    }
  };

  const handleSeedClick = () => {
    if (!jsonFile) {
      toast.error('Please select a JSON file first.');
      return;
    }
    if (wipeData) {
      setIsModalOpen(true);
    } else {
      executeSeed();
    }
  };

  const executeSeed = async () => {
    setIsModalOpen(false);
    setIsSeeding(true);
    setReport(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const data = JSON.parse(content);
        data.wipeData = wipeData;

        const response = await fetch('/api/admin/seed', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        const result = await response.json();
        if (response.ok && result.success) {
          setReport(result.report);
          toast.success('Database seeding process completed!');
        } else {
          throw new Error(result.error || 'An unknown error occurred during seeding.');
        }
      } catch (error: any) {
        toast.error(error.message);
      } finally {
        setIsSeeding(false);
        setConfirmText("");
      }
    };
    reader.readAsText(jsonFile!);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Seed Database</h1>
        <p className="text-slate-600 mt-1">
          Populate the entire platform with initial data from a single JSON file.
        </p>
      </div>

      <div className="p-4 border-l-4 border-red-500 bg-red-50">
        <div className="flex">
          <div className="flex-shrink-0">
            <AlertTriangle className="h-5 w-5 text-red-400" aria-hidden="true" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-bold text-red-800">Warning: Destructive Operation</h3>
            <p className="mt-2 text-sm text-red-700">
              This tool is for initial setup or complete data replacement. If you choose to wipe data, all existing tours, categories, and destinations will be **permanently deleted** before the new data is imported. Please proceed with caution.
            </p>
          </div>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg border shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800">Step 1: Prepare Your JSON File</h2>
        <p className="text-sm text-slate-600 mt-1">Your JSON file must have top-level keys: `destinations`, `categories`, and `tours`.</p>
        <pre className="mt-4 text-xs bg-slate-800 text-white p-4 rounded-md overflow-x-auto">{sampleJson}</pre>
      </div>

      <div className="bg-white p-6 rounded-lg border shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800">Step 2: Upload and Execute</h2>
        <div className="mt-4 space-y-4">
            <div 
                className="flex justify-center items-center w-full h-32 border-2 border-slate-300 border-dashed rounded-lg cursor-pointer hover:bg-slate-50"
                onClick={() => fileInputRef.current?.click()}
            >
                <div className="text-center">
                    <FileJson className="mx-auto h-10 w-10 text-slate-400" />
                    <p className="mt-2 text-sm text-slate-600">{jsonFile ? jsonFile.name : "Click to select a JSON file"}</p>
                </div>
                <input ref={fileInputRef} type="file" accept=".json" onChange={handleFileChange} className="hidden" />
            </div>
            <div className="relative flex items-start">
                <div className="flex h-6 items-center">
                    <input id="wipeData" name="wipeData" type="checkbox" checked={wipeData} onChange={(e) => setWipeData(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-600" />
                </div>
                <div className="ml-3 text-sm leading-6">
                    <label htmlFor="wipeData" className="font-bold text-red-700">Wipe all existing data before importing.</label>
                    <p className="text-slate-500">This will delete EVERYTHING. Use with extreme caution.</p>
                </div>
            </div>
             <button onClick={handleSeedClick} disabled={!jsonFile || isSeeding} className="w-full flex justify-center items-center gap-2 px-6 py-3 text-base font-bold text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                {isSeeding ? <><Loader2 className="animate-spin h-5 w-5"/> Seeding Database...</> : 'Seed Database'}
             </button>
        </div>
      </div>

      {report && (
        <div className="bg-white p-6 rounded-lg border shadow-sm">
            <h2 className="text-lg font-semibold text-slate-800">Import Report</h2>
            <div className="mt-4 space-y-3 text-sm">
                <div className={`flex items-center gap-3 p-3 rounded-md ${report.wipedData ? 'bg-red-50 text-red-800' : 'bg-slate-50 text-slate-800'}`}>
                    {report.wipedData ? <XCircle /> : <CheckCircle />}
                    <span>Data Wipe Enabled: <strong>{report.wipedData ? 'Yes' : 'No'}</strong></span>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-md bg-green-50 text-green-800">
                    <CheckCircle />
                    <span><strong>{report.destinationsCreated}</strong> Destinations Created</span>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-md bg-green-50 text-green-800">
                    <CheckCircle />
                    <span><strong>{report.categoriesCreated}</strong> Categories Created</span>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-md bg-green-50 text-green-800">
                    <CheckCircle />
                    <span><strong>{report.toursCreated}</strong> Tours Created</span>
                </div>
                {report.errors.length > 0 && (
                     <div className="p-4 rounded-md bg-red-50">
                        <h3 className="font-semibold text-red-800">{report.errors.length} Errors Occurred:</h3>
                        <ul className="list-disc pl-5 mt-2 text-red-700">
                            {report.errors.map((err, i) => <li key={i}>{err}</li>)}
                        </ul>
                    </div>
                )}
            </div>
        </div>
      )}

      {isModalOpen && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="relative bg-white rounded-lg shadow-xl p-6 w-full max-w-lg">
            <h3 className="text-lg font-bold text-red-700">Confirm Destructive Action</h3>
            <p className="mt-2 text-sm text-slate-600">This will permanently delete all existing destinations, categories, and tours. This action is irreversible. To proceed, please type <strong className="font-mono text-red-600">WIPE</strong> in the box below.</p>
            <input type="text" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} className="mt-4 block w-full px-3 py-2 border border-slate-300 rounded-md" placeholder="WIPE" />
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50">Cancel</button>
              <button type="button" onClick={executeSeed} disabled={confirmText !== 'WIPE'} className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-md hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed">
                Confirm and Wipe Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default withAuth(SeedPage, { permissions: ['manageDashboard'] });