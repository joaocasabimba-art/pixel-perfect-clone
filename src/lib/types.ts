// Types matching the actual Supabase schema

export type LeadStatus = 'new' | 'quoted' | 'negotiating' | 'won' | 'lost'
export type LeadOrigin = 'WhatsApp' | 'Instagram' | 'Google' | 'Indicação' | 'Outro'
export type ServiceStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
export type ReportStatus = 'draft' | 'signed' | 'sent'

export interface Lead {
  id: string
  company_id: string
  name: string
  phone: string | null
  email: string | null
  origin: string | null
  service_type: string | null
  location: string | null
  notes: string | null
  status: string
  last_action: string | null
  created_at: string
}

export interface Client {
  id: string
  company_id: string
  name: string
  phone: string | null
  email: string | null
  document: string | null
  address: string | null
  city: string | null
  state: string | null
  lead_id: string | null
  tags: string[] | null
  created_at: string
}

export interface Service {
  id: string
  company_id: string
  client_id: string | null
  lead_id: string | null
  assigned_to: string | null
  service_type: string
  status: string
  scheduled_date: string | null
  start_time: string | null
  end_time: string | null
  address: string | null
  value: number | null
  notes: string | null
  created_at: string
  // Joined
  client?: { name: string }
  tech?: { full_name: string }
}

export interface Product {
  id: string
  company_id: string
  name: string
  category: string | null
  unit: string | null
  stock: number
  min_stock: number | null
  cost: number | null
  supplier: string | null
  created_at: string
}

export interface Report {
  id: string
  company_id: string
  client_id: string | null
  service_id: string | null
  tech_id: string | null
  status: string
  content: any
  validity_date: string | null
  created_at: string
  // Joined
  client?: { name: string }
  tech?: { full_name: string }
  service?: { service_type: string }
}

export interface Recurrence {
  id: string
  company_id: string
  client_id: string
  service_type: string
  interval_months: number
  last_service_date: string | null
  next_service_date: string | null
  created_at: string
  // Joined
  client?: { name: string }
}
