export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      api_rate_limits: {
        Row: {
          bucket: string
          hit_at: string
          id: string
          subject: string
        }
        Insert: {
          bucket: string
          hit_at?: string
          id?: string
          subject: string
        }
        Update: {
          bucket?: string
          hit_at?: string
          id?: string
          subject?: string
        }
        Relationships: []
      }
      article_linkedin_posts: {
        Row: {
          article_id: string
          commentary: string
          created_at: string
          created_by: string | null
          error_message: string | null
          id: string
          image_mode: string
          linkedin_post_url: string | null
          linkedin_post_urn: string | null
          mark_layout: Json | null
          posted_at: string | null
          status: Database["public"]["Enums"]["linkedin_post_status"]
          updated_at: string
        }
        Insert: {
          article_id: string
          commentary?: string
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          id?: string
          image_mode?: string
          linkedin_post_url?: string | null
          linkedin_post_urn?: string | null
          mark_layout?: Json | null
          posted_at?: string | null
          status?: Database["public"]["Enums"]["linkedin_post_status"]
          updated_at?: string
        }
        Update: {
          article_id?: string
          commentary?: string
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          id?: string
          image_mode?: string
          linkedin_post_url?: string | null
          linkedin_post_urn?: string | null
          mark_layout?: Json | null
          posted_at?: string | null
          status?: Database["public"]["Enums"]["linkedin_post_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "article_linkedin_posts_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
      article_translations: {
        Row: {
          article_id: string
          content: string
          created_at: string
          excerpt: string
          id: string
          locale: string
          manually_edited: boolean
          source_updated_at: string
          title: string
          updated_at: string
        }
        Insert: {
          article_id: string
          content?: string
          created_at?: string
          excerpt?: string
          id?: string
          locale: string
          manually_edited?: boolean
          source_updated_at?: string
          title?: string
          updated_at?: string
        }
        Update: {
          article_id?: string
          content?: string
          created_at?: string
          excerpt?: string
          id?: string
          locale?: string
          manually_edited?: boolean
          source_updated_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "article_translations_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
      articles: {
        Row: {
          author_id: string
          category: string | null
          category_id: string | null
          content: string
          content_updated_at: string
          created_at: string
          created_by: string | null
          excerpt: string
          featured_image_url: string | null
          first_published_at: string | null
          hero_marks: Json | null
          id: string
          image_credit_name: string | null
          image_credit_url: string | null
          image_source: string | null
          is_featured: boolean
          language: Database["public"]["Enums"]["article_lang"]
          published_at: string | null
          scheduled_at: string | null
          status: Database["public"]["Enums"]["article_status"]
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          category?: string | null
          category_id?: string | null
          content?: string
          content_updated_at?: string
          created_at?: string
          created_by?: string | null
          excerpt?: string
          featured_image_url?: string | null
          first_published_at?: string | null
          hero_marks?: Json | null
          id?: string
          image_credit_name?: string | null
          image_credit_url?: string | null
          image_source?: string | null
          is_featured?: boolean
          language: Database["public"]["Enums"]["article_lang"]
          published_at?: string | null
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["article_status"]
          title?: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          category?: string | null
          category_id?: string | null
          content?: string
          content_updated_at?: string
          created_at?: string
          created_by?: string | null
          excerpt?: string
          featured_image_url?: string | null
          first_published_at?: string | null
          hero_marks?: Json | null
          id?: string
          image_credit_name?: string | null
          image_credit_url?: string | null
          image_source?: string | null
          is_featured?: boolean
          language?: Database["public"]["Enums"]["article_lang"]
          published_at?: string | null
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["article_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "articles_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "articles_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      assistant_knowledge: {
        Row: {
          body: string
          created_at: string
          created_by: string | null
          id: string
          is_published: boolean
          keywords: string[]
          kind: Database["public"]["Enums"]["assistant_knowledge_kind"]
          link_path: string | null
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          body: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_published?: boolean
          keywords?: string[]
          kind?: Database["public"]["Enums"]["assistant_knowledge_kind"]
          link_path?: string | null
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_published?: boolean
          keywords?: string[]
          kind?: Database["public"]["Enums"]["assistant_knowledge_kind"]
          link_path?: string | null
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          id: string
          name: string
          name_de: string | null
          name_fr: string | null
          name_it: string | null
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          name_de?: string | null
          name_fr?: string | null
          name_it?: string | null
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          name_de?: string | null
          name_fr?: string | null
          name_it?: string | null
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      cf_availability_labels: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          name_de: string | null
          name_fr: string | null
          name_it: string | null
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          name_de?: string | null
          name_fr?: string | null
          name_it?: string | null
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          name_de?: string | null
          name_fr?: string | null
          name_it?: string | null
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      cf_client_types: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          name_de: string | null
          name_fr: string | null
          name_it: string | null
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          name_de?: string | null
          name_fr?: string | null
          name_it?: string | null
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          name_de?: string | null
          name_fr?: string | null
          name_it?: string | null
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      cf_credentials: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          name_de: string | null
          name_fr: string | null
          name_it: string | null
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          name_de?: string | null
          name_fr?: string | null
          name_it?: string | null
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          name_de?: string | null
          name_fr?: string | null
          name_it?: string | null
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      cf_event_categories: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          name_de: string | null
          name_fr: string | null
          name_it: string | null
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          name_de?: string | null
          name_fr?: string | null
          name_it?: string | null
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          name_de?: string | null
          name_fr?: string | null
          name_it?: string | null
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      cf_experience_bands: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          name_de: string | null
          name_fr: string | null
          name_it: string | null
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          name_de?: string | null
          name_fr?: string | null
          name_it?: string | null
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          name_de?: string | null
          name_fr?: string | null
          name_it?: string | null
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      cf_formats: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          name_de: string | null
          name_fr: string | null
          name_it: string | null
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          name_de?: string | null
          name_fr?: string | null
          name_it?: string | null
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          name_de?: string | null
          name_fr?: string | null
          name_it?: string | null
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      cf_languages: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          name_de: string | null
          name_fr: string | null
          name_it: string | null
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          name_de?: string | null
          name_fr?: string | null
          name_it?: string | null
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          name_de?: string | null
          name_fr?: string | null
          name_it?: string | null
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      cf_regions: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          name_de: string | null
          name_fr: string | null
          name_it: string | null
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          name_de?: string | null
          name_fr?: string | null
          name_it?: string | null
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          name_de?: string | null
          name_fr?: string | null
          name_it?: string | null
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      cf_specialisations: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          name_de: string | null
          name_fr: string | null
          name_it: string | null
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          name_de?: string | null
          name_fr?: string | null
          name_it?: string | null
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          name_de?: string | null
          name_fr?: string | null
          name_it?: string | null
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      chat_interaction_logs: {
        Row: {
          category_detail: string | null
          category_slug: string
          contact_clicked: boolean
          contact_shown: boolean
          created_at: string
          escalation_reason: string | null
          feedback: Database["public"]["Enums"]["chat_feedback"] | null
          id: string
          locale: string
          occurred_at: string
          outcome: Database["public"]["Enums"]["chat_answer_outcome"]
          session_id: string | null
          updated_at: string
        }
        Insert: {
          category_detail?: string | null
          category_slug?: string
          contact_clicked?: boolean
          contact_shown?: boolean
          created_at?: string
          escalation_reason?: string | null
          feedback?: Database["public"]["Enums"]["chat_feedback"] | null
          id: string
          locale?: string
          occurred_at?: string
          outcome?: Database["public"]["Enums"]["chat_answer_outcome"]
          session_id?: string | null
          updated_at?: string
        }
        Update: {
          category_detail?: string | null
          category_slug?: string
          contact_clicked?: boolean
          contact_shown?: boolean
          created_at?: string
          escalation_reason?: string | null
          feedback?: Database["public"]["Enums"]["chat_feedback"] | null
          id?: string
          locale?: string
          occurred_at?: string
          outcome?: Database["public"]["Enums"]["chat_answer_outcome"]
          session_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      chat_question_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          label_de: string
          label_en: string
          label_fr: string
          label_it: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          label_de?: string
          label_en: string
          label_fr?: string
          label_it?: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          label_de?: string
          label_en?: string
          label_fr?: string
          label_it?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      coach_finder_config: {
        Row: {
          coaching_enabled: boolean
          coaching_label: string
          created_at: string
          csv_export_row_cap: number
          default_sort: string
          feed_drop_threshold_pct: number
          id: boolean
          mentoring_enabled: boolean
          mentoring_label: string
          page_size: number
          snapshot_retention_months: number
          supervision_enabled: boolean
          supervision_label: string
          updated_at: string
        }
        Insert: {
          coaching_enabled?: boolean
          coaching_label?: string
          created_at?: string
          csv_export_row_cap?: number
          default_sort?: string
          feed_drop_threshold_pct?: number
          id?: boolean
          mentoring_enabled?: boolean
          mentoring_label?: string
          page_size?: number
          snapshot_retention_months?: number
          supervision_enabled?: boolean
          supervision_label?: string
          updated_at?: string
        }
        Update: {
          coaching_enabled?: boolean
          coaching_label?: string
          created_at?: string
          csv_export_row_cap?: number
          default_sort?: string
          feed_drop_threshold_pct?: number
          id?: boolean
          mentoring_enabled?: boolean
          mentoring_label?: string
          page_size?: number
          snapshot_retention_months?: number
          supervision_enabled?: boolean
          supervision_label?: string
          updated_at?: string
        }
        Relationships: []
      }
      deck_download_leads: {
        Row: {
          consent: boolean
          created_at: string
          email: string | null
          id: string
          locale: string
          source: string
        }
        Insert: {
          consent?: boolean
          created_at?: string
          email?: string | null
          id?: string
          locale?: string
          source?: string
        }
        Update: {
          consent?: boolean
          created_at?: string
          email?: string | null
          id?: string
          locale?: string
          source?: string
        }
        Relationships: []
      }
      europe_pulse: {
        Row: {
          chapter: string
          country: string
          country_code: string
          created_at: string
          description_de: string | null
          description_en: string | null
          description_fr: string | null
          description_it: string | null
          event_date: string | null
          id: string
          run_id: string | null
          sort_rank: number
          status: Database["public"]["Enums"]["pulse_item_status"]
          title_de: string | null
          title_en: string
          title_fr: string | null
          title_it: string | null
          type: Database["public"]["Enums"]["pulse_item_type"]
          updated_at: string
          url: string
          week_of: string
        }
        Insert: {
          chapter: string
          country: string
          country_code: string
          created_at?: string
          description_de?: string | null
          description_en?: string | null
          description_fr?: string | null
          description_it?: string | null
          event_date?: string | null
          id?: string
          run_id?: string | null
          sort_rank?: number
          status?: Database["public"]["Enums"]["pulse_item_status"]
          title_de?: string | null
          title_en: string
          title_fr?: string | null
          title_it?: string | null
          type?: Database["public"]["Enums"]["pulse_item_type"]
          updated_at?: string
          url: string
          week_of: string
        }
        Update: {
          chapter?: string
          country?: string
          country_code?: string
          created_at?: string
          description_de?: string | null
          description_en?: string | null
          description_fr?: string | null
          description_it?: string | null
          event_date?: string | null
          id?: string
          run_id?: string | null
          sort_rank?: number
          status?: Database["public"]["Enums"]["pulse_item_status"]
          title_de?: string | null
          title_en?: string
          title_fr?: string | null
          title_it?: string | null
          type?: Database["public"]["Enums"]["pulse_item_type"]
          updated_at?: string
          url?: string
          week_of?: string
        }
        Relationships: [
          {
            foreignKeyName: "europe_pulse_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "europe_pulse_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      europe_pulse_chapters: {
        Row: {
          base_url: string
          chapter: string
          consecutive_failures: number
          country: string
          country_code: string
          created_at: string
          id: string
          is_active: boolean
          last_scanned_at: string | null
          last_status: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          base_url: string
          chapter: string
          consecutive_failures?: number
          country: string
          country_code: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_scanned_at?: string | null
          last_status?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          base_url?: string
          chapter?: string
          consecutive_failures?: number
          country?: string
          country_code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_scanned_at?: string | null
          last_status?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      europe_pulse_config: {
        Row: {
          created_at: string
          id: boolean
          item_cap: number
          max_per_chapter: number
          publish_mode: Database["public"]["Enums"]["pulse_publish_mode"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: boolean
          item_cap?: number
          max_per_chapter?: number
          publish_mode?: Database["public"]["Enums"]["pulse_publish_mode"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: boolean
          item_cap?: number
          max_per_chapter?: number
          publish_mode?: Database["public"]["Enums"]["pulse_publish_mode"]
          updated_at?: string
        }
        Relationships: []
      }
      europe_pulse_raw: {
        Row: {
          chapter: string
          chapter_id: string | null
          country: string
          error_message: string | null
          extracted_items: Json
          failure_kind: string | null
          id: string
          run_id: string
          scan_date: string
          source_urls: string[]
          status: string
        }
        Insert: {
          chapter: string
          chapter_id?: string | null
          country: string
          error_message?: string | null
          extracted_items?: Json
          failure_kind?: string | null
          id?: string
          run_id: string
          scan_date?: string
          source_urls?: string[]
          status?: string
        }
        Update: {
          chapter?: string
          chapter_id?: string | null
          country?: string
          error_message?: string | null
          extracted_items?: Json
          failure_kind?: string | null
          id?: string
          run_id?: string
          scan_date?: string
          source_urls?: string[]
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "europe_pulse_raw_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "europe_pulse_chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "europe_pulse_raw_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "europe_pulse_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      europe_pulse_runs: {
        Row: {
          chapters_failed: number
          chapters_ok: number
          chapters_total: number
          created_at: string
          curated_items: number
          error_message: string | null
          finished_at: string | null
          id: string
          raw_items: number
          started_at: string
          status: Database["public"]["Enums"]["pulse_run_status"]
          trigger_source: string
          triggered_by: string | null
          week_of: string
        }
        Insert: {
          chapters_failed?: number
          chapters_ok?: number
          chapters_total?: number
          created_at?: string
          curated_items?: number
          error_message?: string | null
          finished_at?: string | null
          id?: string
          raw_items?: number
          started_at?: string
          status?: Database["public"]["Enums"]["pulse_run_status"]
          trigger_source?: string
          triggered_by?: string | null
          week_of: string
        }
        Update: {
          chapters_failed?: number
          chapters_ok?: number
          chapters_total?: number
          created_at?: string
          curated_items?: number
          error_message?: string | null
          finished_at?: string | null
          id?: string
          raw_items?: number
          started_at?: string
          status?: Database["public"]["Enums"]["pulse_run_status"]
          trigger_source?: string
          triggered_by?: string | null
          week_of?: string
        }
        Relationships: []
      }
      event_cce_applications: {
        Row: {
          additional_facilitators: string | null
          approved_cc_hours: number | null
          approved_rd_hours: number | null
          attendance_monitoring: string | null
          break_minutes: number
          completion_requirements: string | null
          contact_email: string | null
          contact_name: string | null
          content_rationale: string | null
          core_competency_hours: number
          created_at: string
          created_by: string | null
          decision_at: string | null
          decision_notes: string | null
          delivery_method:
            | Database["public"]["Enums"]["event_cce_delivery"]
            | null
          event_id: string
          id: string
          internal_notes: string | null
          jotform_reference: string | null
          learning_objectives: string | null
          primary_facilitator_credential: string | null
          primary_facilitator_name: string | null
          resource_development_hours: number
          status: Database["public"]["Enums"]["event_cce_status"]
          submitted_at: string | null
          submitted_by: string | null
          supporting_material_note: string | null
          supporting_material_url: string | null
          target_audience: string | null
          updated_at: string
        }
        Insert: {
          additional_facilitators?: string | null
          approved_cc_hours?: number | null
          approved_rd_hours?: number | null
          attendance_monitoring?: string | null
          break_minutes?: number
          completion_requirements?: string | null
          contact_email?: string | null
          contact_name?: string | null
          content_rationale?: string | null
          core_competency_hours?: number
          created_at?: string
          created_by?: string | null
          decision_at?: string | null
          decision_notes?: string | null
          delivery_method?:
            | Database["public"]["Enums"]["event_cce_delivery"]
            | null
          event_id: string
          id?: string
          internal_notes?: string | null
          jotform_reference?: string | null
          learning_objectives?: string | null
          primary_facilitator_credential?: string | null
          primary_facilitator_name?: string | null
          resource_development_hours?: number
          status?: Database["public"]["Enums"]["event_cce_status"]
          submitted_at?: string | null
          submitted_by?: string | null
          supporting_material_note?: string | null
          supporting_material_url?: string | null
          target_audience?: string | null
          updated_at?: string
        }
        Update: {
          additional_facilitators?: string | null
          approved_cc_hours?: number | null
          approved_rd_hours?: number | null
          attendance_monitoring?: string | null
          break_minutes?: number
          completion_requirements?: string | null
          contact_email?: string | null
          contact_name?: string | null
          content_rationale?: string | null
          core_competency_hours?: number
          created_at?: string
          created_by?: string | null
          decision_at?: string | null
          decision_notes?: string | null
          delivery_method?:
            | Database["public"]["Enums"]["event_cce_delivery"]
            | null
          event_id?: string
          id?: string
          internal_notes?: string | null
          jotform_reference?: string | null
          learning_objectives?: string | null
          primary_facilitator_credential?: string | null
          primary_facilitator_name?: string | null
          resource_development_hours?: number
          status?: Database["public"]["Enums"]["event_cce_status"]
          submitted_at?: string | null
          submitted_by?: string | null
          supporting_material_note?: string | null
          supporting_material_url?: string | null
          target_audience?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_cce_applications_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_cce_applications_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "events_public"
            referencedColumns: ["id"]
          },
        ]
      }
      event_cce_schedule_rows: {
        Row: {
          application_id: string
          cce_category: Database["public"]["Enums"]["event_cce_category"]
          created_at: string
          delivery_method:
            | Database["public"]["Enums"]["event_cce_delivery"]
            | null
          duration_minutes: number
          ends_at_text: string | null
          facilitator: string | null
          id: string
          position: number
          starts_at_text: string | null
          topic: string | null
          updated_at: string
        }
        Insert: {
          application_id: string
          cce_category?: Database["public"]["Enums"]["event_cce_category"]
          created_at?: string
          delivery_method?:
            | Database["public"]["Enums"]["event_cce_delivery"]
            | null
          duration_minutes?: number
          ends_at_text?: string | null
          facilitator?: string | null
          id?: string
          position?: number
          starts_at_text?: string | null
          topic?: string | null
          updated_at?: string
        }
        Update: {
          application_id?: string
          cce_category?: Database["public"]["Enums"]["event_cce_category"]
          created_at?: string
          delivery_method?:
            | Database["public"]["Enums"]["event_cce_delivery"]
            | null
          duration_minutes?: number
          ends_at_text?: string | null
          facilitator?: string | null
          id?: string
          position?: number
          starts_at_text?: string | null
          topic?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_cce_schedule_rows_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "event_cce_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      event_discount_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          discount_type: string
          discount_value: number
          event_id: string
          expires_at: string | null
          id: string
          internal_note: string | null
          is_active: boolean
          is_archived: boolean
          max_uses: number | null
          member_only: boolean
          starts_at: string | null
          tier_ids: string[]
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          discount_type: string
          discount_value: number
          event_id: string
          expires_at?: string | null
          id?: string
          internal_note?: string | null
          is_active?: boolean
          is_archived?: boolean
          max_uses?: number | null
          member_only?: boolean
          starts_at?: string | null
          tier_ids?: string[]
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          discount_type?: string
          discount_value?: number
          event_id?: string
          expires_at?: string | null
          id?: string
          internal_note?: string | null
          is_active?: boolean
          is_archived?: boolean
          max_uses?: number | null
          member_only?: boolean
          starts_at?: string | null
          tier_ids?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_discount_codes_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_discount_codes_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events_public"
            referencedColumns: ["id"]
          },
        ]
      }
      event_form_questions: {
        Row: {
          condition_question_id: string | null
          condition_value: string | null
          created_at: string
          form_id: string
          help_text: string | null
          help_text_de: string | null
          help_text_fr: string | null
          help_text_it: string | null
          id: string
          is_required: boolean
          label: string
          label_de: string | null
          label_fr: string | null
          label_it: string | null
          options: string[]
          qtype: string
          question_key: string
          rating_max: number
          scale_high_label: string | null
          scale_low_label: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          condition_question_id?: string | null
          condition_value?: string | null
          created_at?: string
          form_id: string
          help_text?: string | null
          help_text_de?: string | null
          help_text_fr?: string | null
          help_text_it?: string | null
          id?: string
          is_required?: boolean
          label: string
          label_de?: string | null
          label_fr?: string | null
          label_it?: string | null
          options?: string[]
          qtype?: string
          question_key: string
          rating_max?: number
          scale_high_label?: string | null
          scale_low_label?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          condition_question_id?: string | null
          condition_value?: string | null
          created_at?: string
          form_id?: string
          help_text?: string | null
          help_text_de?: string | null
          help_text_fr?: string | null
          help_text_it?: string | null
          id?: string
          is_required?: boolean
          label?: string
          label_de?: string | null
          label_fr?: string | null
          label_it?: string | null
          options?: string[]
          qtype?: string
          question_key?: string
          rating_max?: number
          scale_high_label?: string | null
          scale_low_label?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_form_questions_condition_question_id_fkey"
            columns: ["condition_question_id"]
            isOneToOne: false
            referencedRelation: "event_form_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_form_questions_condition_question_id_fkey"
            columns: ["condition_question_id"]
            isOneToOne: false
            referencedRelation: "event_form_questions_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_form_questions_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "event_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_form_questions_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "event_forms_public"
            referencedColumns: ["id"]
          },
        ]
      }
      event_form_recipients: {
        Row: {
          completed_at: string | null
          created_at: string
          email: string
          form_id: string
          id: string
          locale: string
          registration_id: string
          reminder_sent_at: string | null
          send_error: string | null
          sent_at: string | null
          status: string
          token_hash: string | null
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          email: string
          form_id: string
          id?: string
          locale?: string
          registration_id: string
          reminder_sent_at?: string | null
          send_error?: string | null
          sent_at?: string | null
          status?: string
          token_hash?: string | null
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          email?: string
          form_id?: string
          id?: string
          locale?: string
          registration_id?: string
          reminder_sent_at?: string | null
          send_error?: string | null
          sent_at?: string | null
          status?: string
          token_hash?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_form_recipients_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "event_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_form_recipients_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "event_forms_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_form_recipients_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "event_registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      event_form_responses: {
        Row: {
          answers: Json
          created_at: string
          form_id: string
          id: string
          recipient_id: string | null
          registration_id: string
          submitted_at: string
        }
        Insert: {
          answers?: Json
          created_at?: string
          form_id: string
          id?: string
          recipient_id?: string | null
          registration_id: string
          submitted_at?: string
        }
        Update: {
          answers?: Json
          created_at?: string
          form_id?: string
          id?: string
          recipient_id?: string | null
          registration_id?: string
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_form_responses_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "event_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_form_responses_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "event_forms_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_form_responses_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "event_form_recipients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_form_responses_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "event_registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      event_forms: {
        Row: {
          created_at: string
          event_id: string
          id: string
          intro: string | null
          intro_de: string | null
          intro_fr: string | null
          intro_it: string | null
          is_active: boolean
          kind: string
          name: string
          thank_you: string | null
          thank_you_de: string | null
          thank_you_fr: string | null
          thank_you_it: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          intro?: string | null
          intro_de?: string | null
          intro_fr?: string | null
          intro_it?: string | null
          is_active?: boolean
          kind: string
          name: string
          thank_you?: string | null
          thank_you_de?: string | null
          thank_you_fr?: string | null
          thank_you_it?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          intro?: string | null
          intro_de?: string | null
          intro_fr?: string | null
          intro_it?: string | null
          is_active?: boolean
          kind?: string
          name?: string
          thank_you?: string | null
          thank_you_de?: string | null
          thank_you_fr?: string | null
          thank_you_it?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_forms_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_forms_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events_public"
            referencedColumns: ["id"]
          },
        ]
      }
      event_hosts: {
        Row: {
          created_at: string
          event_id: string
          id: string
          profile_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          profile_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          profile_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "event_hosts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_hosts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_hosts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "coach_directory_public"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "event_hosts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "member_directory_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_registrations: {
        Row: {
          amount_cents: number
          answers: Json
          cancel_token_hash: string | null
          cancellation_error: string | null
          cancellation_note: string | null
          cancellation_sent_at: string | null
          cancellation_status: string
          check_in_token: string | null
          checked_in_at: string | null
          checked_in_by: string | null
          confirmation_error: string | null
          confirmation_sent_at: string | null
          confirmation_sequence: number
          confirmation_status: string
          created_at: string
          created_by_staff: string | null
          currency: string
          discount_amount_cents: number
          discount_code_id: string | null
          discount_code_text: string | null
          discount_type: string | null
          discount_value: number | null
          email: string
          event_id: string
          full_name: string
          hold_expires_at: string | null
          id: string
          locale: string
          notes: string | null
          payment_environment: string | null
          payment_status: Database["public"]["Enums"]["event_payment_status"]
          refund_amount_cents: number
          refund_error: string | null
          refund_status: string
          refunded_at: string | null
          reminder_1d_sent_at: string | null
          reminder_7d_sent_at: string | null
          status: Database["public"]["Enums"]["event_registration_status"]
          stripe_refund_id: string | null
          stripe_session_id: string | null
          tier_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount_cents?: number
          answers?: Json
          cancel_token_hash?: string | null
          cancellation_error?: string | null
          cancellation_note?: string | null
          cancellation_sent_at?: string | null
          cancellation_status?: string
          check_in_token?: string | null
          checked_in_at?: string | null
          checked_in_by?: string | null
          confirmation_error?: string | null
          confirmation_sent_at?: string | null
          confirmation_sequence?: number
          confirmation_status?: string
          created_at?: string
          created_by_staff?: string | null
          currency?: string
          discount_amount_cents?: number
          discount_code_id?: string | null
          discount_code_text?: string | null
          discount_type?: string | null
          discount_value?: number | null
          email: string
          event_id: string
          full_name: string
          hold_expires_at?: string | null
          id?: string
          locale?: string
          notes?: string | null
          payment_environment?: string | null
          payment_status?: Database["public"]["Enums"]["event_payment_status"]
          refund_amount_cents?: number
          refund_error?: string | null
          refund_status?: string
          refunded_at?: string | null
          reminder_1d_sent_at?: string | null
          reminder_7d_sent_at?: string | null
          status?: Database["public"]["Enums"]["event_registration_status"]
          stripe_refund_id?: string | null
          stripe_session_id?: string | null
          tier_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount_cents?: number
          answers?: Json
          cancel_token_hash?: string | null
          cancellation_error?: string | null
          cancellation_note?: string | null
          cancellation_sent_at?: string | null
          cancellation_status?: string
          check_in_token?: string | null
          checked_in_at?: string | null
          checked_in_by?: string | null
          confirmation_error?: string | null
          confirmation_sent_at?: string | null
          confirmation_sequence?: number
          confirmation_status?: string
          created_at?: string
          created_by_staff?: string | null
          currency?: string
          discount_amount_cents?: number
          discount_code_id?: string | null
          discount_code_text?: string | null
          discount_type?: string | null
          discount_value?: number | null
          email?: string
          event_id?: string
          full_name?: string
          hold_expires_at?: string | null
          id?: string
          locale?: string
          notes?: string | null
          payment_environment?: string | null
          payment_status?: Database["public"]["Enums"]["event_payment_status"]
          refund_amount_cents?: number
          refund_error?: string | null
          refund_status?: string
          refunded_at?: string | null
          reminder_1d_sent_at?: string | null
          reminder_7d_sent_at?: string | null
          status?: Database["public"]["Enums"]["event_registration_status"]
          stripe_refund_id?: string | null
          stripe_session_id?: string | null
          tier_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_registrations_discount_code_id_fkey"
            columns: ["discount_code_id"]
            isOneToOne: false
            referencedRelation: "event_discount_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_registrations_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "event_ticket_tiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_registrations_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "event_ticket_tiers_public"
            referencedColumns: ["id"]
          },
        ]
      }
      event_ticket_tiers: {
        Row: {
          capacity: number | null
          created_at: string
          currency: string
          description: string | null
          description_de: string | null
          description_fr: string | null
          description_it: string | null
          event_id: string
          id: string
          is_active: boolean
          name: string
          name_de: string | null
          name_fr: string | null
          name_it: string | null
          price_cents: number
          segment: Database["public"]["Enums"]["event_tier_segment"]
          sort_order: number
          updated_at: string
        }
        Insert: {
          capacity?: number | null
          created_at?: string
          currency?: string
          description?: string | null
          description_de?: string | null
          description_fr?: string | null
          description_it?: string | null
          event_id: string
          id?: string
          is_active?: boolean
          name: string
          name_de?: string | null
          name_fr?: string | null
          name_it?: string | null
          price_cents?: number
          segment?: Database["public"]["Enums"]["event_tier_segment"]
          sort_order?: number
          updated_at?: string
        }
        Update: {
          capacity?: number | null
          created_at?: string
          currency?: string
          description?: string | null
          description_de?: string | null
          description_fr?: string | null
          description_it?: string | null
          event_id?: string
          id?: string
          is_active?: boolean
          name?: string
          name_de?: string | null
          name_fr?: string | null
          name_it?: string | null
          price_cents?: number
          segment?: Database["public"]["Enums"]["event_tier_segment"]
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_ticket_tiers_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_ticket_tiers_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events_public"
            referencedColumns: ["id"]
          },
        ]
      }
      event_translations: {
        Row: {
          created_at: string
          description: string | null
          event_id: string
          id: string
          locale: string
          manually_edited: boolean
          source_updated_at: string
          summary: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          event_id: string
          id?: string
          locale: string
          manually_edited?: boolean
          source_updated_at?: string
          summary?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          event_id?: string
          id?: string
          locale?: string
          manually_edited?: boolean
          source_updated_at?: string
          summary?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_translations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_translations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events_public"
            referencedColumns: ["id"]
          },
        ]
      }
      event_waitlist_entries: {
        Row: {
          converted_registration_id: string | null
          created_at: string
          email: string
          event_id: string
          full_name: string
          id: string
          invite_expires_at: string | null
          invite_token_hash: string | null
          invited_at: string | null
          locale: string
          note: string | null
          status: string
          tier_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          converted_registration_id?: string | null
          created_at?: string
          email: string
          event_id: string
          full_name: string
          id?: string
          invite_expires_at?: string | null
          invite_token_hash?: string | null
          invited_at?: string | null
          locale?: string
          note?: string | null
          status?: string
          tier_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          converted_registration_id?: string | null
          created_at?: string
          email?: string
          event_id?: string
          full_name?: string
          id?: string
          invite_expires_at?: string | null
          invite_token_hash?: string | null
          invited_at?: string | null
          locale?: string
          note?: string | null
          status?: string
          tier_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_waitlist_entries_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_waitlist_entries_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_waitlist_entries_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "event_ticket_tiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_waitlist_entries_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "event_ticket_tiers_public"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          capacity: number | null
          category_id: string | null
          cce_approved_cc_hours: number | null
          cce_approved_rd_hours: number | null
          cce_enabled: boolean
          city: string | null
          community_id: string | null
          content_updated_at: string
          created_at: string
          description: string | null
          ends_at: string | null
          guest_registration_allowed: boolean
          hero_marks: Json | null
          id: string
          image_credit_name: string | null
          image_credit_url: string | null
          image_url: string | null
          is_featured: boolean
          language: Database["public"]["Enums"]["article_lang"]
          location_mode: Database["public"]["Enums"]["event_location_mode"]
          map_location: string | null
          online_url: string | null
          organizer_id: string | null
          practical_notes: string | null
          practical_notes_de: string | null
          practical_notes_fr: string | null
          practical_notes_it: string | null
          published_at: string | null
          recurrence: Json | null
          region_id: string | null
          registration_closes_at: string | null
          registration_mode: Database["public"]["Enums"]["event_registration_mode"]
          registration_opens_at: string | null
          series_id: string | null
          slug: string
          starts_at: string
          status: Database["public"]["Enums"]["event_status"]
          summary: string | null
          timezone: string
          title: string
          updated_at: string
          venue_name: string | null
        }
        Insert: {
          capacity?: number | null
          category_id?: string | null
          cce_approved_cc_hours?: number | null
          cce_approved_rd_hours?: number | null
          cce_enabled?: boolean
          city?: string | null
          community_id?: string | null
          content_updated_at?: string
          created_at?: string
          description?: string | null
          ends_at?: string | null
          guest_registration_allowed?: boolean
          hero_marks?: Json | null
          id?: string
          image_credit_name?: string | null
          image_credit_url?: string | null
          image_url?: string | null
          is_featured?: boolean
          language?: Database["public"]["Enums"]["article_lang"]
          location_mode?: Database["public"]["Enums"]["event_location_mode"]
          map_location?: string | null
          online_url?: string | null
          organizer_id?: string | null
          practical_notes?: string | null
          practical_notes_de?: string | null
          practical_notes_fr?: string | null
          practical_notes_it?: string | null
          published_at?: string | null
          recurrence?: Json | null
          region_id?: string | null
          registration_closes_at?: string | null
          registration_mode?: Database["public"]["Enums"]["event_registration_mode"]
          registration_opens_at?: string | null
          series_id?: string | null
          slug: string
          starts_at: string
          status?: Database["public"]["Enums"]["event_status"]
          summary?: string | null
          timezone?: string
          title: string
          updated_at?: string
          venue_name?: string | null
        }
        Update: {
          capacity?: number | null
          category_id?: string | null
          cce_approved_cc_hours?: number | null
          cce_approved_rd_hours?: number | null
          cce_enabled?: boolean
          city?: string | null
          community_id?: string | null
          content_updated_at?: string
          created_at?: string
          description?: string | null
          ends_at?: string | null
          guest_registration_allowed?: boolean
          hero_marks?: Json | null
          id?: string
          image_credit_name?: string | null
          image_credit_url?: string | null
          image_url?: string | null
          is_featured?: boolean
          language?: Database["public"]["Enums"]["article_lang"]
          location_mode?: Database["public"]["Enums"]["event_location_mode"]
          map_location?: string | null
          online_url?: string | null
          organizer_id?: string | null
          practical_notes?: string | null
          practical_notes_de?: string | null
          practical_notes_fr?: string | null
          practical_notes_it?: string | null
          published_at?: string | null
          recurrence?: Json | null
          region_id?: string | null
          registration_closes_at?: string | null
          registration_mode?: Database["public"]["Enums"]["event_registration_mode"]
          registration_opens_at?: string | null
          series_id?: string | null
          slug?: string
          starts_at?: string
          status?: Database["public"]["Enums"]["event_status"]
          summary?: string | null
          timezone?: string
          title?: string
          updated_at?: string
          venue_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "cf_event_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "events_public"
            referencedColumns: ["community_id"]
          },
          {
            foreignKeyName: "events_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "op_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "team_projects_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "cf_regions"
            referencedColumns: ["id"]
          },
        ]
      }
      governance_documents: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          document_date: string | null
          external_url: string | null
          file_path: string | null
          file_size_bytes: number | null
          id: string
          is_published: boolean
          language: Database["public"]["Enums"]["article_lang"]
          mime_type: string | null
          sort_order: number
          title: string
          updated_at: string
          year: number | null
        }
        Insert: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          document_date?: string | null
          external_url?: string | null
          file_path?: string | null
          file_size_bytes?: number | null
          id?: string
          is_published?: boolean
          language?: Database["public"]["Enums"]["article_lang"]
          mime_type?: string | null
          sort_order?: number
          title: string
          updated_at?: string
          year?: number | null
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          document_date?: string | null
          external_url?: string | null
          file_path?: string | null
          file_size_bytes?: number | null
          id?: string
          is_published?: boolean
          language?: Database["public"]["Enums"]["article_lang"]
          mime_type?: string | null
          sort_order?: number
          title?: string
          updated_at?: string
          year?: number | null
        }
        Relationships: []
      }
      integration_config: {
        Row: {
          account_claim_enabled: boolean
          created_at: string
          cutover_completed_at: string | null
          cutover_completed_by: string | null
          cutover_in_progress: boolean
          email_redirect_to: string | null
          emails_suppressed: boolean
          feed_drop_threshold_pct: number
          grace_period_days: number
          id: boolean
          last_failed_sync_at: string | null
          last_successful_sync_at: string | null
          last_sync_error: string | null
          last_sync_run_id: string | null
          mode: Database["public"]["Enums"]["integration_mode"]
          soap_endpoint_key: string
          updated_at: string
        }
        Insert: {
          account_claim_enabled?: boolean
          created_at?: string
          cutover_completed_at?: string | null
          cutover_completed_by?: string | null
          cutover_in_progress?: boolean
          email_redirect_to?: string | null
          emails_suppressed?: boolean
          feed_drop_threshold_pct?: number
          grace_period_days?: number
          id?: boolean
          last_failed_sync_at?: string | null
          last_successful_sync_at?: string | null
          last_sync_error?: string | null
          last_sync_run_id?: string | null
          mode?: Database["public"]["Enums"]["integration_mode"]
          soap_endpoint_key?: string
          updated_at?: string
        }
        Update: {
          account_claim_enabled?: boolean
          created_at?: string
          cutover_completed_at?: string | null
          cutover_completed_by?: string | null
          cutover_in_progress?: boolean
          email_redirect_to?: string | null
          emails_suppressed?: boolean
          feed_drop_threshold_pct?: number
          grace_period_days?: number
          id?: boolean
          last_failed_sync_at?: string | null
          last_successful_sync_at?: string | null
          last_sync_error?: string | null
          last_sync_run_id?: string | null
          mode?: Database["public"]["Enums"]["integration_mode"]
          soap_endpoint_key?: string
          updated_at?: string
        }
        Relationships: []
      }
      linkedin_config: {
        Row: {
          created_at: string
          id: boolean
          organization_name: string | null
          organization_urn: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: boolean
          organization_name?: string | null
          organization_urn?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: boolean
          organization_name?: string | null
          organization_urn?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      live_chat_conversations: {
        Row: {
          accepted_at: string | null
          created_at: string
          ended_at: string | null
          id: string
          last_message_at: string
          locale: string
          page_path: string | null
          status: string
          updated_at: string
          visitor_email: string | null
          visitor_key_hash: string
          visitor_name: string
          volunteer_name: string | null
          volunteer_user_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          ended_at?: string | null
          id?: string
          last_message_at?: string
          locale?: string
          page_path?: string | null
          status?: string
          updated_at?: string
          visitor_email?: string | null
          visitor_key_hash: string
          visitor_name?: string
          volunteer_name?: string | null
          volunteer_user_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          ended_at?: string | null
          id?: string
          last_message_at?: string
          locale?: string
          page_path?: string | null
          status?: string
          updated_at?: string
          visitor_email?: string | null
          visitor_key_hash?: string
          visitor_name?: string
          volunteer_name?: string | null
          volunteer_user_id?: string | null
        }
        Relationships: []
      }
      live_chat_messages: {
        Row: {
          body: string
          conversation_id: string
          created_at: string
          id: string
          sender: string
        }
        Insert: {
          body: string
          conversation_id: string
          created_at?: string
          id?: string
          sender: string
        }
        Update: {
          body?: string
          conversation_id?: string
          created_at?: string
          id?: string
          sender?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "live_chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      live_chat_presence: {
        Row: {
          created_at: string
          display_name: string
          is_online: boolean
          last_seen_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string
          is_online?: boolean
          last_seen_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string
          is_online?: boolean
          last_seen_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      live_chat_shifts: {
        Row: {
          created_at: string
          created_by: string | null
          ends_at: string
          id: string
          note: string | null
          starts_at: string
          updated_at: string
          volunteer_name: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          ends_at: string
          id?: string
          note?: string | null
          starts_at: string
          updated_at?: string
          volunteer_name?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          ends_at?: string
          id?: string
          note?: string | null
          starts_at?: string
          updated_at?: string
          volunteer_name?: string
        }
        Relationships: []
      }
      member_archive_snapshots: {
        Row: {
          created_at: string
          id: string
          label: string
          payload: Json
          reason: string
          table_counts: Json
          taken_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          payload: Json
          reason?: string
          table_counts?: Json
          taken_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          payload?: Json
          reason?: string
          table_counts?: Json
          taken_by?: string | null
        }
        Relationships: []
      }
      member_directory_profiles: {
        Row: {
          approach: string | null
          availability_note: string | null
          availability_slug: string | null
          booking_url: string | null
          coaching_available: boolean
          contact_email_public: boolean
          content_updated_at: string
          created_at: string
          description: string | null
          experience_band: string | null
          fees_note: string | null
          id: string
          linkedin_url: string | null
          member_id: string
          mentor_accredited: boolean
          mentoring_available: boolean
          primary_locale: string
          profile_image_path: string | null
          qualifications: string | null
          response_time_note: string | null
          session_length_note: string | null
          supervision_accredited: boolean
          supervision_available: boolean
          tagline: string | null
          team_bio: string | null
          testimonial_attribution: string | null
          testimonial_quote: string | null
          updated_at: string
          visibility: Database["public"]["Enums"]["member_visibility"]
          website_url: string | null
        }
        Insert: {
          approach?: string | null
          availability_note?: string | null
          availability_slug?: string | null
          booking_url?: string | null
          coaching_available?: boolean
          contact_email_public?: boolean
          content_updated_at?: string
          created_at?: string
          description?: string | null
          experience_band?: string | null
          fees_note?: string | null
          id?: string
          linkedin_url?: string | null
          member_id: string
          mentor_accredited?: boolean
          mentoring_available?: boolean
          primary_locale?: string
          profile_image_path?: string | null
          qualifications?: string | null
          response_time_note?: string | null
          session_length_note?: string | null
          supervision_accredited?: boolean
          supervision_available?: boolean
          tagline?: string | null
          team_bio?: string | null
          testimonial_attribution?: string | null
          testimonial_quote?: string | null
          updated_at?: string
          visibility?: Database["public"]["Enums"]["member_visibility"]
          website_url?: string | null
        }
        Update: {
          approach?: string | null
          availability_note?: string | null
          availability_slug?: string | null
          booking_url?: string | null
          coaching_available?: boolean
          contact_email_public?: boolean
          content_updated_at?: string
          created_at?: string
          description?: string | null
          experience_band?: string | null
          fees_note?: string | null
          id?: string
          linkedin_url?: string | null
          member_id?: string
          mentor_accredited?: boolean
          mentoring_available?: boolean
          primary_locale?: string
          profile_image_path?: string | null
          qualifications?: string | null
          response_time_note?: string | null
          session_length_note?: string | null
          supervision_accredited?: boolean
          supervision_available?: boolean
          tagline?: string | null
          team_bio?: string | null
          testimonial_attribution?: string | null
          testimonial_quote?: string | null
          updated_at?: string
          visibility?: Database["public"]["Enums"]["member_visibility"]
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "member_directory_profiles_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: true
            referencedRelation: "coach_directory_public"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "member_directory_profiles_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: true
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      member_email_log: {
        Row: {
          actual_recipient: string | null
          created_at: string
          error_message: string | null
          id: string
          intended_recipient: string
          member_id: string | null
          mode: Database["public"]["Enums"]["integration_mode"]
          status: string
          template_key: string
        }
        Insert: {
          actual_recipient?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          intended_recipient: string
          member_id?: string | null
          mode: Database["public"]["Enums"]["integration_mode"]
          status: string
          template_key: string
        }
        Update: {
          actual_recipient?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          intended_recipient?: string
          member_id?: string | null
          mode?: Database["public"]["Enums"]["integration_mode"]
          status?: string
          template_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_email_log_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "coach_directory_public"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "member_email_log_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      member_import_snapshots: {
        Row: {
          change_kind: string
          changed_fields: string[]
          created_at: string
          cst_recno: string
          id: string
          member_id: string | null
          normalized_payload: Json
          sync_run_id: string
        }
        Insert: {
          change_kind?: string
          changed_fields?: string[]
          created_at?: string
          cst_recno: string
          id?: string
          member_id?: string | null
          normalized_payload: Json
          sync_run_id: string
        }
        Update: {
          change_kind?: string
          changed_fields?: string[]
          created_at?: string
          cst_recno?: string
          id?: string
          member_id?: string | null
          normalized_payload?: Json
          sync_run_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_import_snapshots_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "coach_directory_public"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "member_import_snapshots_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_import_snapshots_sync_run_id_fkey"
            columns: ["sync_run_id"]
            isOneToOne: false
            referencedRelation: "member_sync_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      member_lifecycle_queue: {
        Row: {
          created_at: string
          entered_grace_at: string
          id: string
          member_id: string
          notified_at: string | null
          resolution: string | null
          resolved_at: string | null
          scheduled_deletion_at: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          entered_grace_at?: string
          id?: string
          member_id: string
          notified_at?: string | null
          resolution?: string | null
          resolved_at?: string | null
          scheduled_deletion_at: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          entered_grace_at?: string
          id?: string
          member_id?: string
          notified_at?: string | null
          resolution?: string | null
          resolved_at?: string | null
          scheduled_deletion_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_lifecycle_queue_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: true
            referencedRelation: "coach_directory_public"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "member_lifecycle_queue_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: true
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      member_profile_client_types: {
        Row: {
          client_type_id: string
          created_at: string
          profile_id: string
        }
        Insert: {
          client_type_id: string
          created_at?: string
          profile_id: string
        }
        Update: {
          client_type_id?: string
          created_at?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_profile_client_types_client_type_id_fkey"
            columns: ["client_type_id"]
            isOneToOne: false
            referencedRelation: "cf_client_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_profile_client_types_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "coach_directory_public"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "member_profile_client_types_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "member_directory_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      member_profile_formats: {
        Row: {
          created_at: string
          format_id: string
          profile_id: string
        }
        Insert: {
          created_at?: string
          format_id: string
          profile_id: string
        }
        Update: {
          created_at?: string
          format_id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_profile_formats_format_id_fkey"
            columns: ["format_id"]
            isOneToOne: false
            referencedRelation: "cf_formats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_profile_formats_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "coach_directory_public"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "member_profile_formats_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "member_directory_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      member_profile_languages: {
        Row: {
          created_at: string
          language_id: string
          profile_id: string
        }
        Insert: {
          created_at?: string
          language_id: string
          profile_id: string
        }
        Update: {
          created_at?: string
          language_id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_profile_languages_language_id_fkey"
            columns: ["language_id"]
            isOneToOne: false
            referencedRelation: "cf_languages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_profile_languages_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "coach_directory_public"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "member_profile_languages_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "member_directory_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      member_profile_links: {
        Row: {
          attempts: number
          completed_at: string | null
          consumed_at: string | null
          created_at: string
          email: string
          expires_at: string | null
          id: string
          last_attempt_at: string | null
          member_id: string
          requested_at: string
          status: string
          token_hash: string | null
        }
        Insert: {
          attempts?: number
          completed_at?: string | null
          consumed_at?: string | null
          created_at?: string
          email: string
          expires_at?: string | null
          id?: string
          last_attempt_at?: string | null
          member_id: string
          requested_at?: string
          status?: string
          token_hash?: string | null
        }
        Update: {
          attempts?: number
          completed_at?: string | null
          consumed_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string | null
          id?: string
          last_attempt_at?: string | null
          member_id?: string
          requested_at?: string
          status?: string
          token_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "member_profile_links_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "coach_directory_public"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "member_profile_links_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      member_profile_regions: {
        Row: {
          created_at: string
          profile_id: string
          region_id: string
        }
        Insert: {
          created_at?: string
          profile_id: string
          region_id: string
        }
        Update: {
          created_at?: string
          profile_id?: string
          region_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_profile_regions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "coach_directory_public"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "member_profile_regions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "member_directory_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_profile_regions_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "cf_regions"
            referencedColumns: ["id"]
          },
        ]
      }
      member_profile_specialisations: {
        Row: {
          created_at: string
          profile_id: string
          specialisation_id: string
        }
        Insert: {
          created_at?: string
          profile_id: string
          specialisation_id: string
        }
        Update: {
          created_at?: string
          profile_id?: string
          specialisation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_profile_specialisations_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "coach_directory_public"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "member_profile_specialisations_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "member_directory_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_profile_specialisations_specialisation_id_fkey"
            columns: ["specialisation_id"]
            isOneToOne: false
            referencedRelation: "cf_specialisations"
            referencedColumns: ["id"]
          },
        ]
      }
      member_profile_translations: {
        Row: {
          approach: string | null
          availability_note: string | null
          created_at: string
          description: string | null
          fees_note: string | null
          id: string
          is_ready: boolean
          locale: string
          manually_edited: boolean
          profile_id: string
          qualifications: string | null
          response_time_note: string | null
          session_length_note: string | null
          source_updated_at: string
          tagline: string | null
          team_bio: string | null
          testimonial_attribution: string | null
          testimonial_quote: string | null
          updated_at: string
        }
        Insert: {
          approach?: string | null
          availability_note?: string | null
          created_at?: string
          description?: string | null
          fees_note?: string | null
          id?: string
          is_ready?: boolean
          locale: string
          manually_edited?: boolean
          profile_id: string
          qualifications?: string | null
          response_time_note?: string | null
          session_length_note?: string | null
          source_updated_at?: string
          tagline?: string | null
          team_bio?: string | null
          testimonial_attribution?: string | null
          testimonial_quote?: string | null
          updated_at?: string
        }
        Update: {
          approach?: string | null
          availability_note?: string | null
          created_at?: string
          description?: string | null
          fees_note?: string | null
          id?: string
          is_ready?: boolean
          locale?: string
          manually_edited?: boolean
          profile_id?: string
          qualifications?: string | null
          response_time_note?: string | null
          session_length_note?: string | null
          source_updated_at?: string
          tagline?: string | null
          team_bio?: string | null
          testimonial_attribution?: string | null
          testimonial_quote?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_profile_translations_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "coach_directory_public"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "member_profile_translations_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "member_directory_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      member_profile_websites: {
        Row: {
          created_at: string
          id: string
          label: string | null
          link_type: string
          profile_id: string
          sort_order: number
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          label?: string | null
          link_type?: string
          profile_id: string
          sort_order?: number
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string | null
          link_type?: string
          profile_id?: string
          sort_order?: number
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_profile_websites_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "coach_directory_public"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "member_profile_websites_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "member_directory_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      member_sync_events: {
        Row: {
          actor_user_id: string | null
          created_at: string
          cst_recno: string | null
          details: Json
          event_type: string
          id: string
          member_id: string | null
          message: string | null
          severity: string
          sync_run_id: string | null
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          cst_recno?: string | null
          details?: Json
          event_type: string
          id?: string
          member_id?: string | null
          message?: string | null
          severity?: string
          sync_run_id?: string | null
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          cst_recno?: string | null
          details?: Json
          event_type?: string
          id?: string
          member_id?: string | null
          message?: string | null
          severity?: string
          sync_run_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "member_sync_events_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "coach_directory_public"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "member_sync_events_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_sync_events_sync_run_id_fkey"
            columns: ["sync_run_id"]
            isOneToOne: false
            referencedRelation: "member_sync_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      member_sync_runs: {
        Row: {
          created_at: string
          created_count: number
          deactivated_count: number
          error_message: string | null
          feed_member_count: number | null
          finished_at: string | null
          id: string
          mode: Database["public"]["Enums"]["integration_mode"]
          started_at: string
          status: Database["public"]["Enums"]["sync_run_status"]
          trigger_source: string
          triggered_by: string | null
          updated_count: number
        }
        Insert: {
          created_at?: string
          created_count?: number
          deactivated_count?: number
          error_message?: string | null
          feed_member_count?: number | null
          finished_at?: string | null
          id?: string
          mode: Database["public"]["Enums"]["integration_mode"]
          started_at?: string
          status?: Database["public"]["Enums"]["sync_run_status"]
          trigger_source?: string
          triggered_by?: string | null
          updated_count?: number
        }
        Update: {
          created_at?: string
          created_count?: number
          deactivated_count?: number
          error_message?: string | null
          feed_member_count?: number | null
          finished_at?: string | null
          id?: string
          mode?: Database["public"]["Enums"]["integration_mode"]
          started_at?: string
          status?: Database["public"]["Enums"]["sync_run_status"]
          trigger_source?: string
          triggered_by?: string | null
          updated_count?: number
        }
        Relationships: []
      }
      members: {
        Row: {
          activity_state: Database["public"]["Enums"]["member_activity_state"]
          anonymized_at: string | null
          auth_user_id: string | null
          city: string | null
          country: string | null
          created_at: string
          credential_awarded_on: string | null
          credential_expires_on: string | null
          credential_slug: string | null
          cst_recno: string
          diagnostics: Json
          email: string | null
          first_name: string | null
          full_name: string | null
          id: string
          inactive_since: string | null
          last_name: string | null
          last_sync_run_id: string | null
          last_synced_at: string | null
          member_type: string | null
          membership_expiration_date: string | null
          membership_join_date: string | null
          organisation: string | null
          phone: string | null
          scheduled_deletion_at: string | null
          updated_at: string
        }
        Insert: {
          activity_state?: Database["public"]["Enums"]["member_activity_state"]
          anonymized_at?: string | null
          auth_user_id?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          credential_awarded_on?: string | null
          credential_expires_on?: string | null
          credential_slug?: string | null
          cst_recno: string
          diagnostics?: Json
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          inactive_since?: string | null
          last_name?: string | null
          last_sync_run_id?: string | null
          last_synced_at?: string | null
          member_type?: string | null
          membership_expiration_date?: string | null
          membership_join_date?: string | null
          organisation?: string | null
          phone?: string | null
          scheduled_deletion_at?: string | null
          updated_at?: string
        }
        Update: {
          activity_state?: Database["public"]["Enums"]["member_activity_state"]
          anonymized_at?: string | null
          auth_user_id?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          credential_awarded_on?: string | null
          credential_expires_on?: string | null
          credential_slug?: string | null
          cst_recno?: string
          diagnostics?: Json
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          inactive_since?: string | null
          last_name?: string | null
          last_sync_run_id?: string | null
          last_synced_at?: string | null
          member_type?: string | null
          membership_expiration_date?: string | null
          membership_join_date?: string | null
          organisation?: string | null
          phone?: string | null
          scheduled_deletion_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "members_last_sync_run_id_fkey"
            columns: ["last_sync_run_id"]
            isOneToOne: false
            referencedRelation: "member_sync_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      op_assignments: {
        Row: {
          created_at: string
          id: string
          member_id: string
          project_id: string
          role_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          member_id: string
          project_id: string
          role_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          member_id?: string
          project_id?: string
          role_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "op_assignments_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "coach_directory_public"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "op_assignments_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "op_assignments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "events_public"
            referencedColumns: ["community_id"]
          },
          {
            foreignKeyName: "op_assignments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "op_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "op_assignments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "team_projects_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "op_assignments_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "op_project_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      op_project_regions: {
        Row: {
          created_at: string
          project_id: string
          region_id: string
        }
        Insert: {
          created_at?: string
          project_id: string
          region_id: string
        }
        Update: {
          created_at?: string
          project_id?: string
          region_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "op_project_regions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "events_public"
            referencedColumns: ["community_id"]
          },
          {
            foreignKeyName: "op_project_regions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "op_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "op_project_regions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "team_projects_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "op_project_regions_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "cf_regions"
            referencedColumns: ["id"]
          },
        ]
      }
      op_project_roles: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          name_de: string | null
          name_fr: string | null
          name_it: string | null
          project_id: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          name_de?: string | null
          name_fr?: string | null
          name_it?: string | null
          project_id: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          name_de?: string | null
          name_fr?: string | null
          name_it?: string | null
          project_id?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "op_project_roles_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "events_public"
            referencedColumns: ["community_id"]
          },
          {
            foreignKeyName: "op_project_roles_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "op_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "op_project_roles_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "team_projects_public"
            referencedColumns: ["id"]
          },
        ]
      }
      op_projects: {
        Row: {
          cadence_note: string | null
          cadence_note_de: string | null
          cadence_note_fr: string | null
          cadence_note_it: string | null
          contact_email: string | null
          content_updated_at: string
          created_at: string
          description: string | null
          description_de: string | null
          description_fr: string | null
          description_it: string | null
          id: string
          is_active: boolean
          is_community: boolean
          is_featured_community: boolean
          language_slugs: string[]
          name: string
          name_de: string | null
          name_fr: string | null
          name_it: string | null
          public_contact_email: string | null
          signup_url: string | null
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          cadence_note?: string | null
          cadence_note_de?: string | null
          cadence_note_fr?: string | null
          cadence_note_it?: string | null
          contact_email?: string | null
          content_updated_at?: string
          created_at?: string
          description?: string | null
          description_de?: string | null
          description_fr?: string | null
          description_it?: string | null
          id?: string
          is_active?: boolean
          is_community?: boolean
          is_featured_community?: boolean
          language_slugs?: string[]
          name: string
          name_de?: string | null
          name_fr?: string | null
          name_it?: string | null
          public_contact_email?: string | null
          signup_url?: string | null
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          cadence_note?: string | null
          cadence_note_de?: string | null
          cadence_note_fr?: string | null
          cadence_note_it?: string | null
          contact_email?: string | null
          content_updated_at?: string
          created_at?: string
          description?: string | null
          description_de?: string | null
          description_fr?: string | null
          description_it?: string | null
          id?: string
          is_active?: boolean
          is_community?: boolean
          is_featured_community?: boolean
          language_slugs?: string[]
          name?: string
          name_de?: string | null
          name_fr?: string | null
          name_it?: string | null
          public_contact_email?: string | null
          signup_url?: string | null
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      organisation_survey_responses: {
        Row: {
          answers: Json
          consent: boolean
          contact_email: string | null
          contact_name: string | null
          contact_organisation: string | null
          created_at: string
          dimension_scores: Json
          id: string
          locale: string
          maturity_band: string | null
          message: string | null
          primary_pressure: string | null
          source: string
          total_score: number | null
          updated_at: string
        }
        Insert: {
          answers?: Json
          consent?: boolean
          contact_email?: string | null
          contact_name?: string | null
          contact_organisation?: string | null
          created_at?: string
          dimension_scores?: Json
          id?: string
          locale?: string
          maturity_band?: string | null
          message?: string | null
          primary_pressure?: string | null
          source?: string
          total_score?: number | null
          updated_at?: string
        }
        Update: {
          answers?: Json
          consent?: boolean
          contact_email?: string | null
          contact_name?: string | null
          contact_organisation?: string | null
          created_at?: string
          dimension_scores?: Json
          id?: string
          locale?: string
          maturity_band?: string | null
          message?: string | null
          primary_pressure?: string | null
          source?: string
          total_score?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          first_name: string
          id: string
          last_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          first_name?: string
          id: string
          last_name?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          first_name?: string
          id?: string
          last_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      role_grants: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      coach_directory_public: {
        Row: {
          approach: string | null
          availability_note: string | null
          availability_slug: string | null
          booking_url: string | null
          city: string | null
          client_type_slugs: string[] | null
          coaching_available: boolean | null
          contact_email: string | null
          country: string | null
          credential_awarded_on: string | null
          credential_slug: string | null
          description: string | null
          experience_band: string | null
          fees_note: string | null
          format_slugs: string[] | null
          full_name: string | null
          has_directory_credential: boolean | null
          is_active_member: boolean | null
          is_directory_eligible: boolean | null
          is_directory_visible: boolean | null
          language_slugs: string[] | null
          linkedin_url: string | null
          member_id: string | null
          mentor_accredited: boolean | null
          mentoring_available: boolean | null
          organisation: string | null
          primary_locale: string | null
          profile_id: string | null
          profile_image_path: string | null
          qualifications: string | null
          region_slugs: string[] | null
          response_time_note: string | null
          services: string[] | null
          session_length_note: string | null
          specialisation_slugs: string[] | null
          supervision_accredited: boolean | null
          supervision_available: boolean | null
          tagline: string | null
          testimonial_attribution: string | null
          testimonial_quote: string | null
          translations: Json | null
          updated_at: string | null
          website_url: string | null
        }
        Relationships: []
      }
      event_form_questions_public: {
        Row: {
          condition_question_id: string | null
          condition_value: string | null
          event_id: string | null
          form_id: string | null
          help_text: string | null
          help_text_de: string | null
          help_text_fr: string | null
          help_text_it: string | null
          id: string | null
          is_required: boolean | null
          label: string | null
          label_de: string | null
          label_fr: string | null
          label_it: string | null
          options: string[] | null
          qtype: string | null
          question_key: string | null
          rating_max: number | null
          scale_high_label: string | null
          scale_low_label: string | null
          sort_order: number | null
        }
        Relationships: [
          {
            foreignKeyName: "event_form_questions_condition_question_id_fkey"
            columns: ["condition_question_id"]
            isOneToOne: false
            referencedRelation: "event_form_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_form_questions_condition_question_id_fkey"
            columns: ["condition_question_id"]
            isOneToOne: false
            referencedRelation: "event_form_questions_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_form_questions_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "event_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_form_questions_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "event_forms_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_forms_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_forms_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events_public"
            referencedColumns: ["id"]
          },
        ]
      }
      event_forms_public: {
        Row: {
          event_id: string | null
          id: string | null
          kind: string | null
          thank_you: string | null
          thank_you_de: string | null
          thank_you_fr: string | null
          thank_you_it: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_forms_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_forms_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events_public"
            referencedColumns: ["id"]
          },
        ]
      }
      event_ticket_tiers_public: {
        Row: {
          capacity: number | null
          currency: string | null
          description: string | null
          description_de: string | null
          description_fr: string | null
          description_it: string | null
          event_id: string | null
          id: string | null
          is_sold_out: boolean | null
          name: string | null
          name_de: string | null
          name_fr: string | null
          name_it: string | null
          price_cents: number | null
          seats_remaining: number | null
          segment: Database["public"]["Enums"]["event_tier_segment"] | null
          sort_order: number | null
        }
        Relationships: [
          {
            foreignKeyName: "event_ticket_tiers_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_ticket_tiers_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events_public"
            referencedColumns: ["id"]
          },
        ]
      }
      events_public: {
        Row: {
          capacity: number | null
          category_name: string | null
          category_slug: string | null
          cce_approved_cc_hours: number | null
          cce_approved_rd_hours: number | null
          city: string | null
          community_id: string | null
          community_name: string | null
          community_slug: string | null
          description: string | null
          ends_at: string | null
          guest_registration_allowed: boolean | null
          hero_marks: Json | null
          id: string | null
          image_credit_name: string | null
          image_credit_url: string | null
          image_url: string | null
          is_featured: boolean | null
          is_full: boolean | null
          language: Database["public"]["Enums"]["article_lang"] | null
          location_mode:
            | Database["public"]["Enums"]["event_location_mode"]
            | null
          map_location: string | null
          online_url: string | null
          published_at: string | null
          region_name: string | null
          region_slug: string | null
          registration_closes_at: string | null
          registration_count: number | null
          registration_mode:
            | Database["public"]["Enums"]["event_registration_mode"]
            | null
          registration_open: boolean | null
          registration_opens_at: string | null
          seats_remaining: number | null
          slug: string | null
          starts_at: string | null
          summary: string | null
          timezone: string | null
          title: string | null
          updated_at: string | null
          venue_name: string | null
        }
        Relationships: []
      }
      team_directory_public: {
        Row: {
          assignments: Json | null
          contact_email: string | null
          full_name: string | null
          linkedin_url: string | null
          member_id: string | null
          primary_locale: string | null
          primary_sort_order: number | null
          profile_id: string | null
          profile_image_path: string | null
          public_coach_profile_id: string | null
          team_bio: string | null
          translations: Json | null
        }
        Relationships: []
      }
      team_projects_public: {
        Row: {
          cadence_note: string | null
          cadence_note_de: string | null
          cadence_note_fr: string | null
          cadence_note_it: string | null
          contact_email: string | null
          description: string | null
          description_de: string | null
          description_fr: string | null
          description_it: string | null
          id: string | null
          is_community: boolean | null
          is_featured_community: boolean | null
          language_slugs: string[] | null
          name: string | null
          name_de: string | null
          name_fr: string | null
          name_it: string | null
          signup_url: string | null
          slug: string | null
          sort_order: number | null
        }
        Insert: {
          cadence_note?: string | null
          cadence_note_de?: string | null
          cadence_note_fr?: string | null
          cadence_note_it?: string | null
          contact_email?: string | null
          description?: string | null
          description_de?: string | null
          description_fr?: string | null
          description_it?: string | null
          id?: string | null
          is_community?: boolean | null
          is_featured_community?: boolean | null
          language_slugs?: string[] | null
          name?: string | null
          name_de?: string | null
          name_fr?: string | null
          name_it?: string | null
          signup_url?: string | null
          slug?: string | null
          sort_order?: number | null
        }
        Update: {
          cadence_note?: string | null
          cadence_note_de?: string | null
          cadence_note_fr?: string | null
          cadence_note_it?: string | null
          contact_email?: string | null
          description?: string | null
          description_de?: string | null
          description_fr?: string | null
          description_it?: string | null
          id?: string | null
          is_community?: boolean | null
          is_featured_community?: boolean | null
          language_slugs?: string[] | null
          name?: string | null
          name_de?: string | null
          name_fr?: string | null
          name_it?: string | null
          signup_url?: string | null
          slug?: string | null
          sort_order?: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      check_in_registration: {
        Args: { _actor: string; _registration_id: string }
        Returns: Json
      }
      live_chat_online_count: { Args: never; Returns: number }
      member_has_directory_credential: {
        Args: { _credential_expires_on: string; _credential_slug: string }
        Returns: boolean
      }
      member_is_active: {
        Args: {
          _activity_state: Database["public"]["Enums"]["member_activity_state"]
        }
        Returns: boolean
      }
      member_is_directory_eligible: {
        Args: { _member_id: string }
        Returns: boolean
      }
      undo_check_in: {
        Args: { _actor: string; _registration_id: string }
        Returns: Json
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "editor"
        | "user"
        | "contributor"
        | "member"
        | "organizer"
        | "publisher"
        | "administrator"
      article_lang: "en" | "fr" | "de" | "it"
      article_status:
        | "draft"
        | "scheduled"
        | "published"
        | "unpublished"
        | "review"
      assistant_knowledge_kind: "faq" | "note"
      chat_answer_outcome:
        | "successful"
        | "partially_successful"
        | "escalated"
        | "unsuccessful"
        | "unknown"
      chat_feedback: "helpful" | "not_helpful"
      event_cce_category: "core_competency" | "resource_development" | "break"
      event_cce_delivery: "in_person" | "teleclass" | "webinar"
      event_cce_status:
        | "not_requested"
        | "draft"
        | "missing_information"
        | "ready_for_review"
        | "submitted"
        | "approved"
        | "declined"
        | "not_required_rd_only"
        | "separate_conference_process"
      event_location_mode: "in_person" | "online" | "hybrid"
      event_payment_status: "not_required" | "pending" | "paid" | "expired"
      event_registration_mode: "none" | "rsvp" | "rsvp_members" | "rsvp_tickets"
      event_registration_status: "confirmed" | "cancelled"
      event_status: "draft" | "published" | "cancelled"
      event_tier_segment: "member" | "non_member" | "general"
      integration_mode: "test" | "live"
      linkedin_post_status: "pending" | "posted" | "failed"
      member_activity_state: "active" | "inactive" | "grace" | "anonymized"
      member_visibility:
        | "draft"
        | "published"
        | "hidden_inactive"
        | "hidden_admin"
        | "hidden_no_credential"
      pulse_item_status: "pending" | "published" | "hidden"
      pulse_item_type: "event" | "news" | "webinar" | "workshop" | "conference"
      pulse_publish_mode: "automatic" | "manual"
      pulse_run_status: "running" | "succeeded" | "failed"
      sync_run_status: "running" | "succeeded" | "failed" | "aborted"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "admin",
        "editor",
        "user",
        "contributor",
        "member",
        "organizer",
        "publisher",
        "administrator",
      ],
      article_lang: ["en", "fr", "de", "it"],
      article_status: [
        "draft",
        "scheduled",
        "published",
        "unpublished",
        "review",
      ],
      assistant_knowledge_kind: ["faq", "note"],
      chat_answer_outcome: [
        "successful",
        "partially_successful",
        "escalated",
        "unsuccessful",
        "unknown",
      ],
      chat_feedback: ["helpful", "not_helpful"],
      event_cce_category: ["core_competency", "resource_development", "break"],
      event_cce_delivery: ["in_person", "teleclass", "webinar"],
      event_cce_status: [
        "not_requested",
        "draft",
        "missing_information",
        "ready_for_review",
        "submitted",
        "approved",
        "declined",
        "not_required_rd_only",
        "separate_conference_process",
      ],
      event_location_mode: ["in_person", "online", "hybrid"],
      event_payment_status: ["not_required", "pending", "paid", "expired"],
      event_registration_mode: ["none", "rsvp", "rsvp_members", "rsvp_tickets"],
      event_registration_status: ["confirmed", "cancelled"],
      event_status: ["draft", "published", "cancelled"],
      event_tier_segment: ["member", "non_member", "general"],
      integration_mode: ["test", "live"],
      linkedin_post_status: ["pending", "posted", "failed"],
      member_activity_state: ["active", "inactive", "grace", "anonymized"],
      member_visibility: [
        "draft",
        "published",
        "hidden_inactive",
        "hidden_admin",
        "hidden_no_credential",
      ],
      pulse_item_status: ["pending", "published", "hidden"],
      pulse_item_type: ["event", "news", "webinar", "workshop", "conference"],
      pulse_publish_mode: ["automatic", "manual"],
      pulse_run_status: ["running", "succeeded", "failed"],
      sync_run_status: ["running", "succeeded", "failed", "aborted"],
    },
  },
} as const
