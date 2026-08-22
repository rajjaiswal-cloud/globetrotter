export type TripStatus = 'upcoming' | 'ongoing' | 'completed';
export type ItemCategory = 'transport' | 'stay' | 'activities' | 'meals';

export interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  country: string | null;
  avatar_url: string | null;
  additional_info: string | null;
  created_at: string;
}

export interface City {
  id: string;
  name: string;
  country: string;
  description: string | null;
  cost_index: number | null;
  popularity: number | null;
  image_url: string | null;
  created_at: string;
}

export interface Activity {
  id: string;
  city_id: string | null;
  name: string;
  category: string | null;
  cost: number | null;
  duration_minutes: number | null;
  description: string | null;
  image_url: string | null;
  created_at: string;
}

export interface Trip {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  cover_photo_url: string | null;
  start_date: string | null;
  end_date: string | null;
  status: TripStatus;
  is_public: boolean;
  share_slug: string | null;
  budget_limit: number | null;
  created_at: string;
}

export interface TripStop {
  id: string;
  trip_id: string;
  city_id: string | null;
  order_index: number;
  start_date: string | null;
  end_date: string | null;
  budget: number | null;
  notes: string | null;
  created_at: string;
  city?: City | null;
}

export interface ItineraryItem {
  id: string;
  stop_id: string;
  activity_id: string | null;
  custom_title: string | null;
  day_number: number;
  time_slot: string | null;
  cost: number | null;
  category: ItemCategory | null;
  notes: string | null;
  order_index: number;
  created_at: string;
  activity?: Activity | null;
}

export interface TripWithStops extends Trip {
  trip_stops?: TripStop[];
}
