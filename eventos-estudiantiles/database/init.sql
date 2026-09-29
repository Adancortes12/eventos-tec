CREATE EXTENSION IF NOT EXISTS pgcrypto;


/* =========================================
   MAESTROS
   ========================================= */

CREATE TABLE IF NOT EXISTS maestros (
  id uuid NOT NULL DEFAULT gen_random_uuid(),

  sitec_usuario_id text NOT NULL,

  sitec_empleado_id text NOT NULL,

  usuario_sitec text NOT NULL,

  rol_sistema text NOT NULL DEFAULT 'maestro',

  activo boolean NOT NULL DEFAULT true,

  creado_en timestamptz NOT NULL DEFAULT now(),

  actualizado_en timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT maestros_pkey
    PRIMARY KEY (id),

  CONSTRAINT maestros_sitec_usuario_id_key
    UNIQUE (sitec_usuario_id),

  CONSTRAINT maestros_sitec_empleado_id_key
    UNIQUE (sitec_empleado_id),

  CONSTRAINT maestros_usuario_sitec_key
    UNIQUE (usuario_sitec),

  CONSTRAINT maestros_rol_sistema_check
    CHECK (
      rol_sistema IN (
        'maestro',
        'admin',
        'superadmin'
      )
    )
);


/* =========================================
   ESTUDIANTES
   ========================================= */

CREATE TABLE IF NOT EXISTS estudiantes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),

  sitec_usuario_id text NOT NULL,

  numero_estudiante text NOT NULL,

  creado_en timestamptz NOT NULL DEFAULT now(),

  actualizado_en timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT estudiantes_pkey
    PRIMARY KEY (id),

  CONSTRAINT estudiantes_sitec_usuario_id_key
    UNIQUE (sitec_usuario_id),

  CONSTRAINT estudiantes_numero_estudiante_key
    UNIQUE (numero_estudiante)
);


/* =========================================
   EVENTOS
   ========================================= */

CREATE TABLE IF NOT EXISTS eventos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),

  codigo_evento text NOT NULL,

  nombre text NOT NULL,

  descripcion text,

  fecha_evento date NOT NULL,

  hora_evento time without time zone NOT NULL,

  estado text NOT NULL DEFAULT 'activo',

  creado_en timestamptz NOT NULL DEFAULT now(),

  fecha_activacion timestamp without time zone NOT NULL,

  duracion_minutos integer NOT NULL DEFAULT 60,

  creado_por uuid,

  cierre_inscripcion timestamp without time zone
    GENERATED ALWAYS AS (
      (fecha_evento + hora_evento)
      +
      (
        duracion_minutos
        * interval '1 minute'
      )
    ) STORED,

  CONSTRAINT eventos_pkey
    PRIMARY KEY (id),

  CONSTRAINT eventos_codigo_evento_key
    UNIQUE (codigo_evento),

  CONSTRAINT eventos_estado_check
    CHECK (
      estado IN (
        'activo',
        'finalizado'
      )
    ),

  CONSTRAINT eventos_duracion_valida
    CHECK (
      duracion_minutos > 0
    ),

  CONSTRAINT eventos_creado_por_fkey
    FOREIGN KEY (creado_por)
    REFERENCES maestros(id)
    ON DELETE SET NULL
);


/* =========================================
   INSCRIPCIONES
   ========================================= */

CREATE TABLE IF NOT EXISTS inscripciones (
  id uuid NOT NULL DEFAULT gen_random_uuid(),

  evento_id uuid NOT NULL,

  numero_estudiante text NOT NULL,

  nombre_completo text NOT NULL,

  token_qr uuid NOT NULL DEFAULT gen_random_uuid(),

  registrado_en timestamptz NOT NULL DEFAULT now(),

  asistio boolean NOT NULL DEFAULT false,

  asistio_en timestamptz,

  estudiante_id uuid,

  genero text,

  carrera text,

  CONSTRAINT inscripciones_pkey
    PRIMARY KEY (id),

  CONSTRAINT inscripciones_token_qr_key
    UNIQUE (token_qr),

  CONSTRAINT inscripcion_estudiante_unica
    UNIQUE (
      evento_id,
      numero_estudiante
    ),

  CONSTRAINT inscripciones_evento_id_fkey
    FOREIGN KEY (evento_id)
    REFERENCES eventos(id)
    ON DELETE RESTRICT,

  CONSTRAINT inscripciones_estudiante_id_fkey
    FOREIGN KEY (estudiante_id)
    REFERENCES estudiantes(id)
    ON DELETE RESTRICT
);


/* =========================================
   ÍNDICE PARCIAL
   ========================================= */

CREATE UNIQUE INDEX IF NOT EXISTS
  inscripciones_evento_estudiante_unique
ON inscripciones (
  evento_id,
  estudiante_id
)
WHERE estudiante_id IS NOT NULL;