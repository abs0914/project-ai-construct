export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      camera_recordings: {
        Row: {
          camera_id: string
          created_at: string
          duration_seconds: number | null
          ended_at: string | null
          file_size: number | null
          filename: string
          id: string
          recording_type: string | null
          started_at: string
          storage_path: string | null
          thumbnail_path: string | null
        }
        Insert: {
          camera_id: string
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          file_size?: number | null
          filename: string
          id?: string
          recording_type?: string | null
          started_at: string
          storage_path?: string | null
          thumbnail_path?: string | null
        }
        Update: {
          camera_id?: string
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          file_size?: number | null
          filename?: string
          id?: string
          recording_type?: string | null
          started_at?: string
          storage_path?: string | null
          thumbnail_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "camera_recordings_camera_id_fkey"
            columns: ["camera_id"]
            isOneToOne: false
            referencedRelation: "cameras"
            referencedColumns: ["id"]
          },
        ]
      }
      cameras: {
        Row: {
          created_at: string
          id: string
          ip_address: unknown
          is_recording: boolean | null
          last_seen: string | null
          location: string
          name: string
          onvif_port: number | null
          password_encrypted: string | null
          router_id: string | null
          rtsp_url: string | null
          status: string | null
          updated_at: string
          username: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          ip_address: unknown
          is_recording?: boolean | null
          last_seen?: string | null
          location: string
          name: string
          onvif_port?: number | null
          password_encrypted?: string | null
          router_id?: string | null
          rtsp_url?: string | null
          status?: string | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          ip_address?: unknown
          is_recording?: boolean | null
          last_seen?: string | null
          location?: string
          name?: string
          onvif_port?: number | null
          password_encrypted?: string | null
          router_id?: string | null
          rtsp_url?: string | null
          status?: string | null
          updated_at?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_cameras_router"
            columns: ["router_id"]
            isOneToOne: false
            referencedRelation: "vpn_routers"
            referencedColumns: ["id"]
          },
        ]
      }
      security_alerts: {
        Row: {
          alert_type: string
          camera_id: string | null
          created_at: string
          id: string
          message: string
          metadata: Json | null
          resolved: boolean | null
          resolved_at: string | null
          severity: string
        }
        Insert: {
          alert_type: string
          camera_id?: string | null
          created_at?: string
          id?: string
          message: string
          metadata?: Json | null
          resolved?: boolean | null
          resolved_at?: string | null
          severity: string
        }
        Update: {
          alert_type?: string
          camera_id?: string | null
          created_at?: string
          id?: string
          message?: string
          metadata?: Json | null
          resolved?: boolean | null
          resolved_at?: string | null
          severity?: string
        }
        Relationships: [
          {
            foreignKeyName: "security_alerts_camera_id_fkey"
            columns: ["camera_id"]
            isOneToOne: false
            referencedRelation: "cameras"
            referencedColumns: ["id"]
          },
        ]
      }
      site_personnel: {
        Row: {
          badge_number: string | null
          check_in_time: string | null
          check_out_time: string | null
          created_at: string
          id: string
          location: string | null
          name: string
          role: string
          status: string | null
          updated_at: string
        }
        Insert: {
          badge_number?: string | null
          check_in_time?: string | null
          check_out_time?: string | null
          created_at?: string
          id?: string
          location?: string | null
          name: string
          role: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          badge_number?: string | null
          check_in_time?: string | null
          check_out_time?: string | null
          created_at?: string
          id?: string
          location?: string | null
          name?: string
          role?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      vpn_routers: {
        Row: {
          api_key: string | null
          bandwidth_usage: number | null
          created_at: string
          id: string
          ip_address: unknown
          last_seen: string | null
          location: string | null
          model: string | null
          name: string
          updated_at: string
          vpn_status: string | null
          zerotier_enabled: boolean | null
          zerotier_ip_address: unknown | null
          zerotier_network_id: string | null
          zerotier_node_id: string | null
          zerotier_status: string | null
        }
        Insert: {
          api_key?: string | null
          bandwidth_usage?: number | null
          created_at?: string
          id?: string
          ip_address: unknown
          last_seen?: string | null
          location?: string | null
          model?: string | null
          name: string
          updated_at?: string
          vpn_status?: string | null
          zerotier_enabled?: boolean | null
          zerotier_ip_address?: unknown | null
          zerotier_network_id?: string | null
          zerotier_node_id?: string | null
          zerotier_status?: string | null
        }
        Update: {
          api_key?: string | null
          bandwidth_usage?: number | null
          created_at?: string
          id?: string
          ip_address?: unknown
          last_seen?: string | null
          location?: string | null
          model?: string | null
          name?: string
          updated_at?: string
          vpn_status?: string | null
          zerotier_enabled?: boolean | null
          zerotier_ip_address?: unknown | null
          zerotier_network_id?: string | null
          zerotier_node_id?: string | null
          zerotier_status?: string | null
        }
        Relationships: []
      }
      zerotier_networks: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          network_id: string
          network_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          network_id: string
          network_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          network_id?: string
          network_name?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
