import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  FileUp,
  UploadCloud,
  Image as ImageIcon,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  Zap,
  ShieldCheck,
  MapPin,
  Cpu,
  Phone,
  User,
  ExternalLink,
  FileText,
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export default function DocumentsUploadPage({ initialConsumerId = '' }) {
  const [consumers, setConsumers] = useState([]);
  const [selectedConsumerId, setSelectedConsumerId] = useState(initialConsumerId || '');
  const [inverterCapacity, setInverterCapacity] = useState('3kW');

  // File States
  const [aadharFile, setAadharFile] = useState(null); // single file (img/pdf)
  const [panelPhotos, setPanelPhotos] = useState([]); // max 10 photos
  const [inverterPhotos, setInverterPhotos] = useState([]); // max 2 photos
  const [gpsPhotos, setGpsPhotos] = useState([]); // max 2 photos

  // Existing uploaded records for selected consumer
  const [existingDocs, setExistingDocs] = useState({ documents: [], photos: [] });
  const [loadingExisting, setLoadingExisting] = useState(false);

  // UI States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Sync initialConsumerId if passed from another tab
  useEffect(() => {
    if (initialConsumerId) {
      setSelectedConsumerId(String(initialConsumerId));
    }
  }, [initialConsumerId]);

  // Load consumers list for dropdown
  useEffect(() => {
    const fetchConsumers = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/consumers`);
        setConsumers(res.data.consumers || []);
      } catch (err) {
        console.error('Failed to load consumers for dropdown:', err);
      }
    };
    fetchConsumers();
  }, []);

  // Load existing uploaded documents when consumer changes
  const fetchConsumerDocuments = async (consumerId) => {
    if (!consumerId) {
      setExistingDocs({ documents: [], photos: [] });
      return;
    }
    try {
      setLoadingExisting(true);
      const res = await axios.get(`${API_BASE_URL}/documents/consumer/${consumerId}`);
      setExistingDocs({
        documents: res.data.documents || [],
        photos: res.data.photos || [],
      });
    } catch (err) {
      console.error('Error loading existing documents:', err);
    } finally {
      setLoadingExisting(false);
    }
  };

  useEffect(() => {
    fetchConsumerDocuments(selectedConsumerId);
  }, [selectedConsumerId]);

  const selectedConsumer = consumers.find((c) => String(c.id) === String(selectedConsumerId));

  // Helper to create file preview object
  const createPreviewItem = (file) => ({
    file,
    id: `${file.name}-${file.size}-${Math.random()}`,
    url: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
    isPdf: file.type === 'application/pdf',
    name: file.name,
    sizeKb: (file.size / 1024).toFixed(1),
  });

  // Handle Aadhar Card Selection (Limit: 1 file, images/PDFs)
  const handleAadharChange = (e) => {
    setError(null);
    const file = e.target.files[0];
    if (!file) return;

    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'application/pdf'];
    if (!allowed.includes(file.type)) {
      setError('Aadhar Card must be an image (JPEG, PNG, WEBP) or a PDF file.');
      return;
    }

    if (aadharFile?.url) URL.revokeObjectURL(aadharFile.url);
    setAadharFile(createPreviewItem(file));
    e.target.value = '';
  };

  const removeAadhar = () => {
    if (aadharFile?.url) URL.revokeObjectURL(aadharFile.url);
    setAadharFile(null);
  };

  // Handle Multiple Photo Selection with strict limits
  const handleMultiPhotoAdd = (e, currentList, setList, maxCount, fieldLabel) => {
    setError(null);
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const invalidFiles = files.filter((f) => !f.type.startsWith('image/'));
    if (invalidFiles.length > 0) {
      setError(`${fieldLabel} only accepts image files (JPEG, PNG, WEBP).`);
      return;
    }

    if (currentList.length + files.length > maxCount) {
      setError(
        `Cannot add more than ${maxCount} photos for ${fieldLabel}. Currently selected: ${currentList.length}, attempted to add: ${files.length}.`
      );
      return;
    }

    const newPreviewItems = files.map((file) => createPreviewItem(file));
    setList((prev) => [...prev, ...newPreviewItems]);
    e.target.value = '';
  };

  const removeMultiPhoto = (id, list, setList) => {
    const itemToRemove = list.find((item) => item.id === id);
    if (itemToRemove?.url) URL.revokeObjectURL(itemToRemove.url);
    setList((prev) => prev.filter((item) => item.id !== id));
  };

  // Form Submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!selectedConsumerId) {
      setError('Please select a consumer first.');
      return;
    }

    if (!['3kW', '4kW', '5kW'].includes(inverterCapacity)) {
      setError('Please select a valid inverter capacity (3kW, 4kW, or 5kW).');
      return;
    }

    if (!aadharFile) {
      setError('Aadhar Card file is required (1 image or PDF).');
      return;
    }

    if (panelPhotos.length > 10) {
      setError('Panel Serial Num photos cannot exceed 10.');
      return;
    }

    if (inverterPhotos.length > 2) {
      setError('Inverter Serial Num photos cannot exceed 2.');
      return;
    }

    if (gpsPhotos.length > 2) {
      setError('GPS Plant photos cannot exceed 2.');
      return;
    }

    const formData = new FormData();
    formData.append('consumer_id', selectedConsumerId);
    formData.append('inverter_capacity', inverterCapacity);
    formData.append('aadhar_card', aadharFile.file);

    panelPhotos.forEach((item) => formData.append('panel_photos', item.file));
    inverterPhotos.forEach((item) => formData.append('inverter_photos', item.file));
    gpsPhotos.forEach((item) => formData.append('gps_photos', item.file));

    try {
      setLoading(true);
      const res = await axios.post(`${API_BASE_URL}/documents`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setSuccess(
        `Successfully uploaded documents for Consumer #${selectedConsumerId} (${
          selectedConsumer?.name || ''
        })! Saved Aadhar & ${res.data.photosCount} site photos.`
      );

      // Clean up object URLs
      if (aadharFile?.url) URL.revokeObjectURL(aadharFile.url);
      panelPhotos.forEach((p) => p.url && URL.revokeObjectURL(p.url));
      inverterPhotos.forEach((p) => p.url && URL.revokeObjectURL(p.url));
      gpsPhotos.forEach((p) => p.url && URL.revokeObjectURL(p.url));

      setAadharFile(null);
      setPanelPhotos([]);
      setInverterPhotos([]);
      setGpsPhotos([]);

      // Refresh existing documents view
      fetchConsumerDocuments(selectedConsumerId);
    } catch (err) {
      console.error('Upload failed:', err);
      setError(
        err.response?.data?.error || 'Failed to upload documents. Please verify backend connection.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Delete an uploaded document submission (and its linked photos)
  const handleDeleteDocument = async (docId) => {
    if (!window.confirm(`Are you sure you want to delete Document Submission #${docId}?`)) return;
    try {
      await axios.delete(`${API_BASE_URL}/documents/${docId}`);
      setSuccess(`Deleted Document Submission #${docId} successfully.`);
      fetchConsumerDocuments(selectedConsumerId);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete document record.');
    }
  };

  // Delete an individual uploaded photo
  const handleDeletePhoto = async (photoId) => {
    if (!window.confirm('Are you sure you want to delete this uploaded photo?')) return;
    try {
      await axios.delete(`${API_BASE_URL}/documents/photo/${photoId}`);
      setSuccess('Photo deleted successfully.');
      fetchConsumerDocuments(selectedConsumerId);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete photo.');
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Hero Banner */}
      <div className="bg-gradient-to-br from-purple-700 via-violet-700 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="p-3.5 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20">
              <FileUp className="w-7 h-7 text-purple-200" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-widest text-purple-200 bg-white/10 px-2.5 py-0.5 rounded-full">
                Stage 4 &bull; Documentation &amp; Asset Verification
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold mt-1 font-display">
                Documents &amp; Site Photos Upload
              </h1>
              <p className="text-sm text-purple-100/90 mt-1">
                Upload KYC Aadhar proof, solar panel serial numbers, inverter specifications, and geo-tagged plant photos.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Feedback Alerts */}
      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start space-x-3 text-emerald-800 shadow-sm">
          <CheckCircle2 className="w-5 h-5 mt-0.5 text-emerald-600 flex-shrink-0" />
          <div className="text-sm font-semibold">{success}</div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start space-x-3 text-rose-800 shadow-sm">
          <AlertCircle className="w-5 h-5 mt-0.5 text-rose-600 flex-shrink-0" />
          <div className="text-sm font-semibold">{error}</div>
        </div>
      )}

      {/* Main Upload Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Consumer & Inverter Capacity Card */}
        <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/90 shadow-sm space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Consumer Selection Dropdown */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                1. Select Consumer <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedConsumerId}
                onChange={(e) => setSelectedConsumerId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm font-semibold text-slate-800 transition"
                required
              >
                <option value="">-- Choose Registered Consumer --</option>
                {consumers.map((c) => (
                  <option key={c.id} value={c.id}>
                    #{c.id} — {c.name} ({c.phone_number})
                  </option>
                ))}
              </select>

              {/* Selected Consumer Info Pill */}
              {selectedConsumer && (
                <div className="mt-3 p-3.5 rounded-2xl bg-purple-50/60 border border-purple-100 flex items-start justify-between text-xs">
                  <div className="space-y-1">
                    <div className="font-bold text-slate-900 flex items-center space-x-1.5">
                      <User className="w-3.5 h-3.5 text-purple-600" />
                      <span>{selectedConsumer.name}</span>
                    </div>
                    <div className="text-slate-600 flex items-center space-x-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>{selectedConsumer.phone_number}</span>
                    </div>
                    <div className="text-slate-500 flex items-center space-x-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span className="truncate max-w-xs">{selectedConsumer.address}</span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-md font-mono font-bold bg-purple-100 text-purple-800">
                    ID #{selectedConsumer.id}
                  </span>
                </div>
              )}
            </div>

            {/* Inverter Capacity Dropdown (Strictly 3kW, 4kW, 5kW) + Visual Cards */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                2. Inverter Capacity <span className="text-rose-500">*</span>
              </label>
              <select
                value={inverterCapacity}
                onChange={(e) => setInverterCapacity(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm font-semibold text-slate-800 transition"
                required
              >
                <option value="3kW">3kW</option>
                <option value="4kW">4kW</option>
                <option value="5kW">5kW</option>
              </select>

              {/* Quick Interactive Capacity Pills */}
              <div className="grid grid-cols-3 gap-2.5 mt-3">
                {['3kW', '4kW', '5kW'].map((cap) => {
                  const active = inverterCapacity === cap;
                  return (
                    <button
                      key={cap}
                      type="button"
                      onClick={() => setInverterCapacity(cap)}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center space-x-1.5 transition ${
                        active
                          ? 'bg-purple-600 text-white border-purple-600 shadow-sm shadow-purple-500/20'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <Zap className={`w-3.5 h-3.5 ${active ? 'text-amber-300' : 'text-slate-400'}`} />
                      <span>{cap}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Step 2: Bento Grid for 4 File Upload Categories */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card A: Aadhar Card (1 file, Image/PDF) */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-5 h-5 text-purple-600" />
                  <h3 className="text-sm font-bold text-slate-900">
                    Aadhar Card <span className="text-rose-500">*</span>
                  </h3>
                </div>
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                    aadharFile
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {aadharFile ? '1 / 1 file' : '0 / 1 file'}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Upload consumer KYC Aadhar proof (Supports Image or PDF, max 1 file)
              </p>
            </div>

            {!aadharFile ? (
              <label className="border-2 border-dashed border-slate-200 hover:border-purple-400 bg-slate-50/60 hover:bg-purple-50/30 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition group">
                <div className="w-11 h-11 rounded-2xl bg-purple-100/80 text-purple-600 flex items-center justify-center mb-2 group-hover:scale-105 transition">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-slate-700">
                  Click to browse Aadhar Card
                </span>
                <span className="text-[11px] text-slate-400 mt-0.5">
                  PDF, JPG, PNG, or WEBP (Max 10MB)
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={handleAadharChange}
                  className="hidden"
                />
              </label>
            ) : (
              <div className="flex items-center justify-between p-3.5 bg-purple-50/50 border border-purple-200/80 rounded-2xl">
                <div className="flex items-center space-x-3 overflow-hidden">
                  {aadharFile.isPdf ? (
                    <div className="w-14 h-14 rounded-xl bg-rose-100 text-rose-700 flex flex-col items-center justify-center font-extrabold text-xs flex-shrink-0 border border-rose-200">
                      <FileText className="w-5 h-5 mb-0.5" />
                      <span>PDF</span>
                    </div>
                  ) : (
                    <img
                      src={aadharFile.url}
                      alt="Aadhar Preview"
                      className="w-14 h-14 object-cover rounded-xl border border-slate-200 flex-shrink-0"
                    />
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">{aadharFile.name}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{aadharFile.sizeKb} KB</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={removeAadhar}
                  className="p-2 rounded-xl text-rose-600 hover:bg-rose-100 transition flex-shrink-0"
                  title="Remove Aadhar file"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Card B: Inverter Serial Number Photos (Max 2) */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center space-x-2">
                  <Cpu className="w-5 h-5 text-blue-600" />
                  <h3 className="text-sm font-bold text-slate-900">
                    Inverter Serial Number Photos
                  </h3>
                </div>
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                    inverterPhotos.length >= 2
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {inverterPhotos.length} / 2 photos
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Clear photos of inverter serial sticker (Maximum 2 photos)
              </p>
            </div>

            {inverterPhotos.length < 2 && (
              <label className="border-2 border-dashed border-slate-200 hover:border-blue-400 bg-slate-50/60 hover:bg-blue-50/30 rounded-2xl p-5 flex flex-col items-center justify-center cursor-pointer transition group">
                <ImageIcon className="w-6 h-6 text-blue-500 mb-1.5 group-hover:scale-105 transition" />
                <span className="text-xs font-bold text-slate-700">
                  Add Inverter Serial Photos
                </span>
                <span className="text-[11px] text-slate-400">
                  Up to {2 - inverterPhotos.length} more image(s)
                </span>
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) =>
                    handleMultiPhotoAdd(
                      e,
                      inverterPhotos,
                      setInverterPhotos,
                      2,
                      'Inverter Serial Photos'
                    )
                  }
                  className="hidden"
                />
              </label>
            )}

            {inverterPhotos.length > 0 && (
              <div className="grid grid-cols-2 gap-3">
                {inverterPhotos.map((item) => (
                  <div
                    key={item.id}
                    className="relative group rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 h-28"
                  >
                    <img src={item.url} alt={item.name} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeMultiPhoto(item.id, inverterPhotos, setInverterPhotos)}
                      className="absolute top-1.5 right-1.5 p-1 bg-black/65 hover:bg-rose-600 text-white rounded-lg transition"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    <span className="absolute bottom-1 left-1 right-1 text-[10px] text-white bg-black/55 px-1.5 py-0.5 rounded truncate">
                      {item.name}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Card C: Panel Serial Number Photos (Max 10) - Spans full width on medium+ if needed or 1 col */}
          <div className="md:col-span-2 bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <Zap className="w-5 h-5 text-amber-500" />
                  <h3 className="text-sm font-bold text-slate-900">
                    Solar Panel Serial Number Photos
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Upload barcode / serial number photos for installed PV modules (Maximum 10 photos)
                </p>
              </div>
              <span
                className={`text-xs font-bold px-3 py-1 rounded-full ${
                  panelPhotos.length >= 10
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                {panelPhotos.length} / 10 photos
              </span>
            </div>

            {panelPhotos.length < 10 && (
              <label className="border-2 border-dashed border-slate-200 hover:border-amber-400 bg-slate-50/60 hover:bg-amber-50/30 rounded-2xl p-5 flex flex-col items-center justify-center cursor-pointer transition group">
                <ImageIcon className="w-6 h-6 text-amber-500 mb-1.5 group-hover:scale-105 transition" />
                <span className="text-xs font-bold text-slate-700">
                  Select Panel Serial Photos (Multiple Allowed)
                </span>
                <span className="text-[11px] text-slate-400">
                  You can select up to {10 - panelPhotos.length} more photo(s)
                </span>
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) =>
                    handleMultiPhotoAdd(e, panelPhotos, setPanelPhotos, 10, 'Panel Serial Photos')
                  }
                  className="hidden"
                />
              </label>
            )}

            {panelPhotos.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
                {panelPhotos.map((item, idx) => (
                  <div
                    key={item.id}
                    className="relative group rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 aspect-square"
                  >
                    <img src={item.url} alt={item.name} className="w-full h-full object-cover" />
                    <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 text-[10px] font-bold bg-black/60 text-white rounded-md">
                      #{idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeMultiPhoto(item.id, panelPhotos, setPanelPhotos)}
                      className="absolute top-1.5 right-1.5 p-1 bg-black/65 hover:bg-rose-600 text-white rounded-lg transition"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    <span className="absolute bottom-1 left-1 right-1 text-[10px] text-white bg-black/55 px-1.5 py-0.5 rounded truncate">
                      {item.name}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Card D: GPS Plant Photos (Max 2) */}
          <div className="md:col-span-2 bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <MapPin className="w-5 h-5 text-emerald-600" />
                  <h3 className="text-sm font-bold text-slate-900">GPS Plant Site Photos</h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Upload geo-tagged site photos showing consumer with installed solar plant (Maximum 2 photos)
                </p>
              </div>
              <span
                className={`text-xs font-bold px-3 py-1 rounded-full ${
                  gpsPhotos.length >= 2
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                {gpsPhotos.length} / 2 photos
              </span>
            </div>

            {gpsPhotos.length < 2 && (
              <label className="border-2 border-dashed border-slate-200 hover:border-emerald-400 bg-slate-50/60 hover:bg-emerald-50/30 rounded-2xl p-5 flex flex-col items-center justify-center cursor-pointer transition group">
                <ImageIcon className="w-6 h-6 text-emerald-600 mb-1.5 group-hover:scale-105 transition" />
                <span className="text-xs font-bold text-slate-700">Add GPS Plant Photos</span>
                <span className="text-[11px] text-slate-400">
                  Up to {2 - gpsPhotos.length} more photo(s)
                </span>
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) =>
                    handleMultiPhotoAdd(e, gpsPhotos, setGpsPhotos, 2, 'GPS Plant Photos')
                  }
                  className="hidden"
                />
              </label>
            )}

            {gpsPhotos.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                {gpsPhotos.map((item) => (
                  <div
                    key={item.id}
                    className="relative group rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 h-36"
                  >
                    <img src={item.url} alt={item.name} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeMultiPhoto(item.id, gpsPhotos, setGpsPhotos)}
                      className="absolute top-1.5 right-1.5 p-1 bg-black/65 hover:bg-rose-600 text-white rounded-lg transition"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    <span className="absolute bottom-1 left-1 right-1 text-[10px] text-white bg-black/55 px-1.5 py-0.5 rounded truncate">
                      {item.name}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Submit Action Bar */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-500">
            Ready to upload:{' '}
            <strong className="text-slate-800">
              {aadharFile ? '1 Aadhar' : '0 Aadhar'}, {panelPhotos.length} Panel,{' '}
              {inverterPhotos.length} Inverter, {gpsPhotos.length} GPS
            </strong>{' '}
            &bull; Capacity: <strong className="text-purple-700">{inverterCapacity}</strong>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 border border-transparent text-sm font-bold rounded-xl text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 shadow-lg shadow-purple-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading Multipart Payload...
              </>
            ) : (
              <>
                <FileUp className="w-4 h-4 mr-2" />
                Submit All Documents &amp; Photos
              </>
            )}
          </button>
        </div>
      </form>

      {/* Previously Uploaded Documents for Selected Consumer */}
      {selectedConsumerId &&
        (existingDocs.documents.length > 0 || existingDocs.photos.length > 0) && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 font-display">
                  Uploaded Records for {selectedConsumer?.name || `Consumer #${selectedConsumerId}`}
                </h3>
                <p className="text-xs text-slate-500">
                  Previously stored documents and site photos in database
                </p>
              </div>
              {loadingExisting && <Loader2 className="w-4 h-4 animate-spin text-purple-600" />}
            </div>

            {existingDocs.documents.length > 0 && (
              <div className="space-y-3">
                {existingDocs.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <span className="font-bold text-slate-900">
                        Document Submission #{doc.id} &bull; Inverter Capacity:{' '}
                        <span className="text-purple-700">{doc.inverter_capacity}</span>
                      </span>
                      <div className="text-slate-400">
                        Uploaded on {new Date(doc.created_at).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <a
                        href={doc.aadhar_card_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-purple-700 font-bold hover:bg-purple-50 transition w-fit"
                      >
                        <span>View Aadhar Card</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <button
                        type="button"
                        onClick={() => handleDeleteDocument(doc.id)}
                        title="Delete Document Submission"
                        className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 font-bold hover:bg-rose-600 hover:text-white transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {existingDocs.photos.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">
                  Stored Site &amp; Serial Photos ({existingDocs.photos.length})
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
                  {existingDocs.photos.map((photo) => (
                    <div
                      key={photo.id}
                      className="group relative rounded-xl overflow-hidden border border-slate-200 aspect-square bg-slate-100"
                    >
                      <a href={photo.file_url} target="_blank" rel="noreferrer" className="block w-full h-full">
                        <img
                          src={photo.file_url}
                          alt={photo.file_name}
                          className="w-full h-full object-cover group-hover:scale-105 transition"
                        />
                      </a>
                      <button
                        type="button"
                        onClick={() => handleDeletePhoto(photo.id)}
                        title="Delete Photo"
                        className="absolute top-1.5 right-1.5 p-1.5 bg-black/65 hover:bg-rose-600 text-white rounded-lg transition shadow"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <span className="absolute bottom-1 left-1 right-1 text-[10px] font-semibold bg-black/65 text-white px-1.5 py-0.5 rounded truncate pointer-events-none">
                        {photo.category.replace(/_/g, ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
    </div>
  );
}
