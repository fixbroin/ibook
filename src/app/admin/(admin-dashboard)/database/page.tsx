
'use client';

import { useState, useRef, useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Download, Upload, AlertTriangle, Database } from 'lucide-react';
import { exportDb, importDb } from '@/lib/admin.actions';

export default function DatabasePage() {
  const [isExporting, startExportTransition] = useTransition();
  const [isImporting, startImportTransition] = useTransition();
  const [fileToImport, setFileToImport] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleExport = () => {
    startExportTransition(async () => {
      const result = await exportDb();
      if (result.success && result.data) {
        const blob = new Blob([result.data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `brobookme-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast({ title: 'Export Successful', description: 'Your database has been exported.' });
      } else {
        toast({ title: 'Export Failed', description: result.error, variant: 'destructive' });
      }
    });
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/json') {
      setFileToImport(file);
    } else {
      toast({ title: 'Invalid File', description: 'Please select a valid JSON file.', variant: 'destructive' });
      setFileToImport(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleImport = () => {
    if (!fileToImport) {
      toast({ title: 'No File Selected', description: 'Please select a file to import.', variant: 'destructive' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      startImportTransition(async () => {
        const result = await importDb(content);
        if (result.success) {
          toast({ title: 'Import Successful', description: `${result.count} collections were updated.` });
        } else {
          toast({ title: 'Import Failed', description: result.error, variant: 'destructive' });
        }
        setFileToImport(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      });
    };
    reader.onerror = () => {
        toast({ title: 'Error Reading File', description: 'Could not read the selected file.', variant: 'destructive' });
    };
    reader.readAsText(fileToImport);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Database className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Firestore Database Tools</h1>
          <p className="text-muted-foreground">Export your database to a JSON file or import a previously exported file.</p>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Export Database</CardTitle>
          <CardDescription>Download a complete snapshot of all specified collections as a single JSON file. This is useful for backups or migrating data.</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Important Note on Exporting</AlertTitle>
            <AlertDescription>
              This tool exports predefined top-level collections. It does not handle nested subcollections within documents (e.g., chat messages). For complete backups, use the official Google Cloud Platform (GCP) Firestore export feature.
            </AlertDescription>
          </Alert>
          <Button onClick={handleExport} disabled={isExporting} className="mt-4">
            {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Export Database to JSON
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Import Database</CardTitle>
          <CardDescription>Import data from a JSON file that was previously exported using this tool.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Warning: This is a Destructive Action</AlertTitle>
            <AlertDescription>
              Importing will <span className="font-bold">overwrite</span> any existing documents with the same ID in the target collections. There is no undo. It is highly recommended to perform an export first.
            </AlertDescription>
          </Alert>
          <div>
            <label htmlFor="json-upload" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select JSON File
            </label>
            <Input
              id="json-upload"
              type="file"
              accept="application/json"
              onChange={handleFileChange}
              ref={fileInputRef}
              className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
            />
          </div>
          <Button onClick={handleImport} disabled={isImporting || !fileToImport} variant="destructive">
            {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            Import and Overwrite Data
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
