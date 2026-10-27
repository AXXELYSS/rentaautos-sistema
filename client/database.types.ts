export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.18';
  };
  public: {
    Tables: {
      rental_autos: {
        Row: {
          anio: number;
          created_at: string;
          estado: string;
          id: string;
          kilometraje: number;
          marca: string;
          modelo: string;
          owner_id: string;
          placa: string;
          tarifa_diaria: number;
        };
        Insert: {
          anio: number;
          created_at?: string;
          estado?: string;
          id?: string;
          kilometraje?: number;
          marca: string;
          modelo: string;
          owner_id?: string;
          placa: string;
          tarifa_diaria: number;
        };
        Update: {
          anio?: number;
          created_at?: string;
          estado?: string;
          id?: string;
          kilometraje?: number;
          marca?: string;
          modelo?: string;
          owner_id?: string;
          placa?: string;
          tarifa_diaria?: number;
        };
        Relationships: [];
      };
      rental_inspecciones: {
        Row: {
          combustible: number;
          created_at: string;
          id: string;
          kilometraje: number;
          observaciones: string;
          owner_id: string;
          reserva_id: string;
          tipo: string;
        };
        Insert: {
          combustible: number;
          created_at?: string;
          id?: string;
          kilometraje: number;
          observaciones?: string;
          owner_id?: string;
          reserva_id: string;
          tipo: string;
        };
        Update: {
          combustible?: number;
          created_at?: string;
          id?: string;
          kilometraje?: number;
          observaciones?: string;
          owner_id?: string;
          reserva_id?: string;
          tipo?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'rental_inspecciones_reserva_id_owner_id_fkey';
            columns: ['reserva_id', 'owner_id'];
            isOneToOne: false;
            referencedRelation: 'rental_reservas';
            referencedColumns: ['id', 'owner_id'];
          },
        ];
      };
      rental_pagos: {
        Row: {
          created_at: string;
          fecha_pago: string;
          id: string;
          metodo: string;
          monto: number;
          owner_id: string;
          referencia: string;
          reserva_id: string;
          tipo: string;
        };
        Insert: {
          created_at?: string;
          fecha_pago?: string;
          id?: string;
          metodo: string;
          monto: number;
          owner_id?: string;
          referencia?: string;
          reserva_id: string;
          tipo?: string;
        };
        Update: {
          created_at?: string;
          fecha_pago?: string;
          id?: string;
          metodo?: string;
          monto?: number;
          owner_id?: string;
          referencia?: string;
          reserva_id?: string;
          tipo?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'rental_pagos_reserva_id_owner_id_fkey';
            columns: ['reserva_id', 'owner_id'];
            isOneToOne: false;
            referencedRelation: 'rental_reservas';
            referencedColumns: ['id', 'owner_id'];
          },
        ];
      };
      rental_reservas: {
        Row: {
          auto_id: string;
          cliente_dni: string;
          cliente_nombre: string;
          created_at: string;
          estado: string;
          fecha_fin: string;
          fecha_inicio: string;
          id: string;
          owner_id: string;
          tarifa_aplicada: number;
          total: number;
        };
        Insert: {
          auto_id: string;
          cliente_dni: string;
          cliente_nombre: string;
          created_at?: string;
          estado?: string;
          fecha_fin: string;
          fecha_inicio: string;
          id?: string;
          owner_id?: string;
          tarifa_aplicada?: number;
          total?: number;
        };
        Update: {
          auto_id?: string;
          cliente_dni?: string;
          cliente_nombre?: string;
          created_at?: string;
          estado?: string;
          fecha_fin?: string;
          fecha_inicio?: string;
          id?: string;
          owner_id?: string;
          tarifa_aplicada?: number;
          total?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'rental_reservas_auto_id_owner_id_fkey';
            columns: ['auto_id', 'owner_id'];
            isOneToOne: false;
            referencedRelation: 'rental_autos';
            referencedColumns: ['id', 'owner_id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      rental_quote: {
        Args: { p_auto_id: string; p_fin: string; p_inicio: string };
        Returns: Json;
      };
      rental_quote_edit: {
        Args: {
          p_auto_id: string;
          p_fin: string;
          p_inicio: string;
          p_reserva_id?: string;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
