export type UserRole = 'admin' | 'curator' | 'visitor';

export type ArtifactCondition = 'excellent' | 'good' | 'fair' | 'poor' | 'critical' | 'restored';

export type ArtifactStatus = 'active' | 'on_loan' | 'in_conservation' | 'archived';

export type AcquisitionMethod =
  | ''
  | 'purchase'
  | 'donation'
  | 'bequest'
  | 'excavation'
  | 'field_collection'
  | 'exchange';

export type OwnershipStatus = 'owned' | 'on_loan' | 'borrowed' | 'joint_ownership';

export type ExhibitionStatus = 'upcoming' | 'active' | 'ended' | 'cancelled';

export type OwnershipType = 'private' | 'institutional' | 'government' | 'religious' | 'unknown';

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  created_at: string;
}

export interface Artist {
  id: string;
  name: string;
  biography: string;
  birth_year: number | null;
  death_year: number | null;
  nationality: string;
  created_at: string;
}

export interface HistoricalPeriod {
  id: string;
  name: string;
  start_year: number | null;
  end_year: number | null;
  description: string;
  created_at: string;
}

export interface Location {
  id: string;
  building: string;
  gallery: string;
  room: string | null;
  shelf_or_display: string | null;
  description: string;
  created_at: string;
}

export interface Artifact {
  id: string;
  accession_number: string;
  name: string;
  description: string;
  category_id: string | null;
  artist_id: string | null;
  historical_period_id: string | null;
  origin: string;
  creation_date: string;
  material: string;
  dimensions: string;
  weight: string;
  condition: ArtifactCondition;
  acquisition_date: string | null;
  acquisition_method: AcquisitionMethod;
  ownership_status: OwnershipStatus;
  current_location_id: string | null;
  status: ArtifactStatus;
  is_public: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ArtifactImage {
  id: string;
  artifact_id: string;
  image_url: string;
  caption: string;
  is_primary: boolean;
  uploaded_by: string | null;
  created_at: string;
}

export interface Exhibition {
  id: string;
  name: string;
  description: string;
  start_date: string | null;
  end_date: string | null;
  location_id: string | null;
  status: ExhibitionStatus;
  cover_image_url: string | null;
  created_at: string;
}

export interface ExhibitionArtifact {
  id: string;
  exhibition_id: string;
  artifact_id: string;
  display_order: number;
  created_at: string;
}

export interface Acquisition {
  id: string;
  artifact_id: string;
  acquisition_date: string | null;
  acquisition_method: AcquisitionMethod;
  source: string;
  price: number | null;
  donor_name: string;
  documentation: string;
  notes: string;
  created_at: string;
}

export interface ProvenanceRecord {
  id: string;
  artifact_id: string;
  owner_name: string;
  location: string;
  start_date: string | null;
  end_date: string | null;
  ownership_type: OwnershipType;
  description: string;
  created_at: string;
}

export interface ConservationRecord {
  id: string;
  artifact_id: string;
  assessment_date: string;
  condition: ArtifactCondition;
  treatment: string;
  conservator: string;
  treatment_date: string | null;
  next_inspection_date: string | null;
  notes: string;
  before_image_url: string | null;
  after_image_url: string | null;
  created_at: string;
}

export interface Favorite {
  id: string;
  user_id: string;
  artifact_id: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  description: string;
  created_at: string;
}

export interface ArtifactReviewSummary {
  artifact_id: string;
  average_rating: number;
  review_count: number;
  five_star: number;
  four_star: number;
  three_star: number;
  two_star: number;
  one_star: number;
}

export interface ArtifactWithRelations extends Artifact {
  category?: Category | null;
  artist?: Artist | null;
  historical_period?: HistoricalPeriod | null;
  current_location?: Location | null;
  artifact_images?: ArtifactImage[];
  review_summary?: ArtifactReviewSummary | null;
}

export interface ExhibitionWithRelations extends Exhibition {
  location?: Location | null;
  exhibition_artifacts?: { artifact: ArtifactWithRelations }[];
}

export type ReviewStatus = 'published' | 'hidden' | 'pending';

export interface Review {
  id: string;
  user_id: string;
  artifact_id: string;
  rating: number;
  title: string;
  body: string;
  is_approved: boolean;
  status: ReviewStatus;
  created_at: string;
  updated_at: string;
}

export interface ReviewWithRelations extends Review {
  user?: Pick<Profile, 'id' | 'full_name' | 'email'> | null;
  artifact?: Pick<Artifact, 'id' | 'name' | 'accession_number'> | null;
}

export interface Comment {
  id: string;
  user_id: string;
  artifact_id: string;
  body: string;
  is_approved: boolean;
  status: ReviewStatus;
  created_at: string;
  updated_at: string;
}

export interface CommentWithRelations extends Comment {
  user?: Pick<Profile, 'id' | 'full_name' | 'email'> | null;
  artifact?: Pick<Artifact, 'id' | 'name' | 'accession_number'> | null;
}

export interface CategoryLike {
  id: string;
  user_id: string;
  category_id: string;
  created_at: string;
}

export interface Cart {
  id: string;
  user_id: string;
  status: 'active' | 'checked_out' | 'abandoned';
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface CartItem {
  id: string;
  cart_id: string;
  artifact_id: string;
  quantity: number;
  notes: string;
  added_by: string | null;
  created_at: string;
}

export interface CartWithRelations extends Cart {
  user?: Pick<Profile, 'id' | 'full_name' | 'email'> | null;
  cart_items?: (CartItem & { artifact?: ArtifactWithRelations | null })[];
}
