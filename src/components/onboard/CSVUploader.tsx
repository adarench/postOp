import { useState, useRef } from 'react';
import { CloudArrowUpIcon, DocumentTextIcon, ExclamationTriangleIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import Papa from 'papaparse';
import { PatientUploadRow } from '@/types';

interface CSVUploaderProps {
  onUpload: (patients: PatientUploadRow[]) => void;
}

export default function CSVUploader({ onUpload }: CSVUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [previewData, setPreviewData] = useState<PatientUploadRow[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const requiredColumns = ['first_name', 'last_initial', 'phone', 'procedure_type', 'surgery_date'];

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const csvFile = files.find(file => file.type === 'text/csv' || file.name.endsWith('.csv'));

    if (csvFile) {
      processFile(csvFile);
    } else {
      setErrors(['Please upload a CSV file']);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    setIsProcessing(true);
    setErrors([]);
    setPreviewData([]);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          validateAndProcessData(results.data as any[]);
        } catch (error) {
          setErrors([error instanceof Error ? error.message : 'Unknown error occurred']);
        } finally {
          setIsProcessing(false);
        }
      },
      error: (error) => {
        setErrors([`CSV parsing error: ${error.message}`]);
        setIsProcessing(false);
      }
    });
  };

  const validateAndProcessData = (data: any[]) => {
    if (data.length === 0) {
      throw new Error('CSV file is empty');
    }

    const firstRow = data[0];
    const columns = Object.keys(firstRow);

    // Check for required columns
    const missingColumns = requiredColumns.filter(col => !columns.includes(col));
    if (missingColumns.length > 0) {
      throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
    }

    const validationErrors: string[] = [];
    const processedPatients: PatientUploadRow[] = [];

    data.forEach((row, index) => {
      const rowNumber = index + 2; // +2 because of header row and 1-based indexing
      const patient: PatientUploadRow = {
        first_name: (row.first_name || '').trim(),
        last_initial: (row.last_initial || '').trim(),
        phone: (row.phone || '').trim(),
        procedure_type: (row.procedure_type || '').trim(),
        surgery_date: (row.surgery_date || '').trim()
      };

      // Validate required fields
      if (!patient.first_name) {
        validationErrors.push(`Row ${rowNumber}: First name is required`);
      }
      if (!patient.last_initial) {
        validationErrors.push(`Row ${rowNumber}: Last initial is required`);
      }
      if (!patient.phone) {
        validationErrors.push(`Row ${rowNumber}: Phone number is required`);
      } else {
        // Validate phone format
        const cleanPhone = patient.phone.replace(/\D/g, '');
        if (cleanPhone.length < 10) {
          validationErrors.push(`Row ${rowNumber}: Phone number must be at least 10 digits`);
        }
      }
      if (!patient.procedure_type) {
        validationErrors.push(`Row ${rowNumber}: Procedure type is required`);
      }
      if (!patient.surgery_date) {
        validationErrors.push(`Row ${rowNumber}: Surgery date is required`);
      } else {
        // Validate date format
        const date = new Date(patient.surgery_date);
        if (isNaN(date.getTime())) {
          validationErrors.push(`Row ${rowNumber}: Invalid surgery date format (use YYYY-MM-DD)`);
        }
      }

      if (validationErrors.length === 0 || validationErrors.filter(e => e.includes(`Row ${rowNumber}`)).length === 0) {
        processedPatients.push(patient);
      }
    });

    if (validationErrors.length > 0) {
      setErrors(validationErrors.slice(0, 10)); // Show first 10 errors
      if (validationErrors.length > 10) {
        setErrors(prev => [...prev, `... and ${validationErrors.length - 10} more errors`]);
      }
      return;
    }

    if (processedPatients.length === 0) {
      throw new Error('No valid patient records found');
    }

    setPreviewData(processedPatients);
  };

  const handleConfirmUpload = () => {
    if (previewData.length > 0) {
      onUpload(previewData);
    }
  };

  return (
    <div>
      <div className="text-center mb-6">
        <h2 className="text-lg font-medium text-gray-900 mb-2">Upload Patient Roster</h2>
        <p className="text-sm text-gray-600">
          Upload a CSV file with patient information to start monitoring
        </p>
      </div>

      {/* Upload area */}
      {previewData.length === 0 && (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onDragEnter={() => setIsDragging(true)}
          onDragLeave={() => setIsDragging(false)}
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragging ? 'border-blue-400 bg-blue-50' : 'border-gray-300'
          }`}
        >
          <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Drop your CSV file here
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Or click to browse and select a file
          </p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="btn-primary"
            disabled={isProcessing}
          >
            {isProcessing ? 'Processing...' : 'Select CSV File'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      )}

      {/* CSV Format Help */}
      {previewData.length === 0 && (
        <div className="mt-6 bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Required CSV Format:</h4>
          <div className="text-xs font-mono bg-white p-3 rounded border overflow-x-auto">
            <div>first_name,last_initial,phone,procedure_type,surgery_date</div>
            <div className="text-gray-600">
              Sarah,J,555-123-4567,Rhinoplasty,2024-01-15<br />
              Michael,R,555-987-6543,Septoplasty,2024-01-16
            </div>
          </div>
          <p className="text-xs text-gray-600 mt-2">
            • Phone numbers can include dashes or parentheses<br />
            • Surgery dates should be in YYYY-MM-DD format<br />
            • All fields are required
          </p>
        </div>
      )}

      {/* Errors */}
      {errors.length > 0 && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mt-0.5 mr-2" />
            <div>
              <h4 className="text-sm font-medium text-red-800">
                Found {errors.length} error{errors.length !== 1 ? 's' : ''} in your CSV:
              </h4>
              <ul className="mt-2 text-sm text-red-700 list-disc list-inside">
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
              <button
                onClick={() => {
                  setErrors([]);
                  setPreviewData([]);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                  }
                }}
                className="mt-3 text-sm text-red-600 hover:text-red-800 underline"
              >
                Upload a different file
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview */}
      {previewData.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              Preview: {previewData.length} Patient{previewData.length !== 1 ? 's' : ''}
            </h3>
            <button
              onClick={() => {
                setPreviewData([]);
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                }
              }}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              Upload different file
            </button>
          </div>

          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Procedure</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Surgery Date</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {previewData.slice(0, 5).map((patient, index) => (
                    <tr key={index}>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {patient.first_name} {patient.last_initial}.
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{patient.phone}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{patient.procedure_type}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{patient.surgery_date}</td>
                    </tr>
                  ))}
                  {previewData.length > 5 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-3 text-sm text-gray-500 text-center">
                        ... and {previewData.length - 5} more patients
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button onClick={handleConfirmUpload} className="btn-primary">
              Continue with {previewData.length} Patient{previewData.length !== 1 ? 's' : ''}
              <ArrowRightIcon className="ml-2 h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}