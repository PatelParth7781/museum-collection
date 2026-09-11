import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Save, Loader2, AlertCircle } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { logAction } from '@/lib/audit';
import { FormField, TextInput, TextArea, SelectField } from '@/components/ui/FormField';
import { ImageUploader } from '@/components/ImageUploader';
import type { Category, Artist, HistoricalPeriod, Location, ArtifactImage } from '@/types';

interface FormData {
  accession_number: string; name: string; description: string; category_id: string; artist_id: string;
  historical_period_id: string; origin: string; creation_date: string; material: string; dimensions: string;
  weight: string; condition: string; acquisition_date: string; acquisition_method: string;
  ownership_status: string; current_location_id: string; status: string; is_public: boolean;
}

const initialForm: FormData = {
  accession_number: '', name: '', description: '', category_id: '', artist_id: '',
  historical_period_id: '', origin: '', creation_date: '', material: '', dimensions: '',
  weight: '', condition: 'good', acquisition_date: '', acquisition_method: '', ownership_status: 'owned',
  current_location_id: '', status: 'active', is_public: true,
};

export default function ArtifactForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { toast } = useToast();
  const isEdit = !!id;

  const [form, setForm] = useState<FormData>(initialForm);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(isEdit);
  const [options, setOptions] = useState<{ categories: Category[]; artists: Artist[]; periods: HistoricalPeriod[]; locations: Location[] }>({ categories: [], artists: [], periods: [], locations: [] });
  const [images, setImages] = useState<ArtifactImage[]>([]);

  useEffect(() => {
    Promise.all([
      supabase.from('categories').select('*').order('name'),
      supabase.from('artists').select('*').order('name'),
      supabase.from('historical_periods').select('*').order('start_year'),
      supabase.from('locations').select('*').order('building'),
    ]).then(([c, a, p, l]) => {
      setOptions({ categories: c.data ?? [], artists: a.data ?? [], periods: p.data ?? [], locations: l.data ?? [] });
    });
  }, []);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data } = await supabase.from('artifacts').select('*').eq('id', id).maybeSingle();
      if (data) {
        setForm({
          ...initialForm,
          ...data,
          acquisition_date: data.acquisition_date ?? '',
          category_id: data.category_id ?? '',
          artist_id: data.artist_id ?? '',
          historical_period_id: data.historical_period_id ?? '',
          current_location_id: data.current_location_id ?? '',
        });
      }
      const { data: imgs } = await supabase.from('artifact_images').select('*').eq('artifact_id', id).order('is_primary', { ascending: false });
      setImages(imgs ?? []);
      setPageLoading(false);
    })();
  }, [id]);

  const validate = (): boolean => {
    const e: Partial<Record<keyof FormData, string>> = {};
    if (!form.accession_number.trim()) e.accession_number = 'Accession number is required';
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.condition) e.condition = 'Condition is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const checkDuplicateAccession = async (accNum: string): Promise<boolean> => {
    let query = supabase.from('artifacts').select('id').eq('accession_number', accNum);
    if (id) query = query.neq('id', id);
    const { data } = await query.maybeSingle();
    return !!data;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) { toast('Please fix the errors in the form', 'error'); return; }

    const isDuplicate = await checkDuplicateAccession(form.accession_number);
    if (isDuplicate) {
      setErrors((prev) => ({ ...prev, accession_number: 'An artifact with this accession number already exists' }));
      toast('Accession number already exists', 'error');
      return;
    }

    setLoading(true);
    const payload = {
      ...form,
      category_id: form.category_id || null,
      artist_id: form.artist_id || null,
      historical_period_id: form.historical_period_id || null,
      current_location_id: form.current_location_id || null,
      acquisition_date: form.acquisition_date || null,
      created_by: isEdit ? undefined : profile?.id,
    };

    if (isEdit) {
      const { error } = await supabase.from('artifacts').update(payload).eq('id', id);
      if (error) { toast('Failed to update artifact', 'error'); setLoading(false); return; }
      toast('Artifact updated successfully', 'success');
      await logAction('artifact_updated', 'artifact', id, `Artifact "${form.name}" updated by ${profile?.email}`);
    } else {
      const { data, error } = await supabase.from('artifacts').insert(payload).select('id').single();
      if (error) { toast('Failed to create artifact', 'error'); setLoading(false); return; }
      toast('Artifact created successfully', 'success');
      await logAction('artifact_created', 'artifact', data.id, `Artifact "${form.name}" created by ${profile?.email}`);
      navigate(`/admin/artifacts/${data.id}/edit`);
      return;
    }
    setLoading(false);
    navigate('/admin/artifacts');
  };

  const fetchImages = async () => {
    if (!id) return;
    const { data } = await supabase.from('artifact_images').select('*').eq('artifact_id', id).order('is_primary', { ascending: false });
    setImages(data ?? []);
  };

  if (pageLoading) return <DashboardLayout title={isEdit ? 'Edit Artifact' : 'Add Artifact'}><div className="card p-8 text-center text-stone-500">Loading...</div></DashboardLayout>;

  return (
    <DashboardLayout title={isEdit ? 'Edit Artifact' : 'Add New Artifact'}>
      <Link to="/admin/artifacts" className="inline-flex items-center gap-2 text-sm text-stone-500 hover:text-stone-700 mb-6">
        <ArrowLeft size={16} /> Back to Artifacts
      </Link>

      {Object.keys(errors).length > 0 && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-700">
          <AlertCircle size={18} /> Please fix the highlighted errors below.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="card p-6">
          <h3 className="text-base font-semibold text-stone-800 mb-4">Basic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Accession Number" required error={errors.accession_number}>
              <TextInput value={form.accession_number} onChange={(e) => setForm({ ...form, accession_number: e.target.value })} placeholder="e.g. MCMS-2024-001" />
            </FormField>
            <FormField label="Artifact Name" required error={errors.name}>
              <TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Sandstone Buddha Head" />
            </FormField>
          </div>
          <div className="mt-4">
            <FormField label="Description">
              <TextArea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Detailed description of the artifact..." />
            </FormField>
          </div>
        </div>

        {/* Classification */}
        <div className="card p-6">
          <h3 className="text-base font-semibold text-stone-800 mb-4">Classification & Attribution</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Category">
              <SelectField value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
                <option value="">Select category...</option>
                {options.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </SelectField>
            </FormField>
            <FormField label="Artist / Creator">
              <SelectField value={form.artist_id} onChange={(e) => setForm({ ...form, artist_id: e.target.value })}>
                <option value="">Select artist...</option>
                {options.artists.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </SelectField>
            </FormField>
            <FormField label="Historical Period">
              <SelectField value={form.historical_period_id} onChange={(e) => setForm({ ...form, historical_period_id: e.target.value })}>
                <option value="">Select period...</option>
                {options.periods.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </SelectField>
            </FormField>
            <FormField label="Origin">
              <TextInput value={form.origin} onChange={(e) => setForm({ ...form, origin: e.target.value })} placeholder="e.g. Sarnath, Uttar Pradesh" />
            </FormField>
            <FormField label="Creation Date">
              <TextInput value={form.creation_date} onChange={(e) => setForm({ ...form, creation_date: e.target.value })} placeholder="e.g. 5th century CE" />
            </FormField>
            <FormField label="Material">
              <TextInput value={form.material} onChange={(e) => setForm({ ...form, material: e.target.value })} placeholder="e.g. Sandstone, Bronze" />
            </FormField>
            <FormField label="Dimensions">
              <TextInput value={form.dimensions} onChange={(e) => setForm({ ...form, dimensions: e.target.value })} placeholder="e.g. 28 x 22 x 18 cm" />
            </FormField>
            <FormField label="Weight">
              <TextInput value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} placeholder="e.g. 12.5 kg" />
            </FormField>
          </div>
        </div>

        {/* Status & Location */}
        <div className="card p-6">
          <h3 className="text-base font-semibold text-stone-800 mb-4">Status & Location</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Condition" required error={errors.condition}>
              <SelectField value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })}>
                <option value="excellent">Excellent</option><option value="good">Good</option>
                <option value="fair">Fair</option><option value="poor">Poor</option>
                <option value="critical">Critical</option><option value="restored">Restored</option>
              </SelectField>
            </FormField>
            <FormField label="Status">
              <SelectField value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="active">Active</option><option value="on_loan">On Loan</option>
                <option value="in_conservation">In Conservation</option><option value="archived">Archived</option>
              </SelectField>
            </FormField>
            <FormField label="Current Location">
              <SelectField value={form.current_location_id} onChange={(e) => setForm({ ...form, current_location_id: e.target.value })}>
                <option value="">Select location...</option>
                {options.locations.map((l) => <option key={l.id} value={l.id}>{l.building} — {l.gallery}{l.room ? `, ${l.room}` : ''}</option>)}
              </SelectField>
            </FormField>
            <FormField label="Ownership Status">
              <SelectField value={form.ownership_status} onChange={(e) => setForm({ ...form, ownership_status: e.target.value })}>
                <option value="owned">Owned</option><option value="on_loan">On Loan</option>
                <option value="borrowed">Borrowed</option><option value="joint_ownership">Joint Ownership</option>
              </SelectField>
            </FormField>
          </div>
        </div>

        {/* Acquisition */}
        <div className="card p-6">
          <h3 className="text-base font-semibold text-stone-800 mb-4">Acquisition Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Acquisition Date">
              <TextInput type="date" value={form.acquisition_date} onChange={(e) => setForm({ ...form, acquisition_date: e.target.value })} />
            </FormField>
            <FormField label="Acquisition Method">
              <SelectField value={form.acquisition_method} onChange={(e) => setForm({ ...form, acquisition_method: e.target.value })}>
                <option value="">None</option><option value="purchase">Purchase</option>
                <option value="donation">Donation</option><option value="bequest">Bequest</option>
                <option value="excavation">Excavation</option><option value="field_collection">Field Collection</option>
                <option value="exchange">Exchange</option>
              </SelectField>
            </FormField>
          </div>
        </div>

        {/* Visibility */}
        <div className="card p-6">
          <h3 className="text-base font-semibold text-stone-800 mb-4">Visibility</h3>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={form.is_public} onChange={(e) => setForm({ ...form, is_public: e.target.checked })} className="w-5 h-5 rounded border-stone-300 text-amber-600 focus:ring-amber-600" />
            <div>
              <p className="text-sm font-medium text-stone-700">Publicly visible</p>
              <p className="text-xs text-stone-500">If checked, this artifact will be visible to all visitors</p>
            </div>
          </label>
        </div>

        {/* Image Upload (only in edit mode) */}
        {isEdit && id && (
          <div className="card p-6">
            <h3 className="text-base font-semibold text-stone-800 mb-4">Artifact Images</h3>
            <ImageUploader artifactId={id} images={images} onImagesChanged={fetchImages} />
          </div>
        )}

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Link to="/admin/artifacts" className="btn-secondary">Cancel</Link>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            {loading ? 'Saving...' : isEdit ? 'Update Artifact' : 'Create Artifact'}
          </button>
        </div>
      </form>
    </DashboardLayout>
  );
}
