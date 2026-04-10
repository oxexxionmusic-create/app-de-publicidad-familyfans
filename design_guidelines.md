{
  "brand": {
    "name": "Family Fans Mony",
    "language": "es-ES",
    "personality": [
      "confiable",
      "financiero-profesional",
      "moderno",
      "orientado a operaciones (admin-first)",
      "creadores + publicidad + música"
    ],
    "positioning_notes": "Plataforma de marketplace con dinero real y verificación manual. La UI debe priorizar claridad, estados, auditoría y trazabilidad. Dark theme primario con acentos fríos (teal/ocean) + un acento cálido controlado (ámbar) para alertas/pendientes."
  },

  "design_tokens": {
    "css_custom_properties": {
      "notes": "Implementar en /app/frontend/src/index.css dentro de :root y .dark. Mantener HSL para compatibilidad con shadcn. Evitar gradientes saturados (reglas al final).",
      "recommended_dark_theme": {
        "--background": "222 22% 7%",
        "--foreground": "210 20% 96%",

        "--card": "222 22% 9%",
        "--card-foreground": "210 20% 96%",

        "--popover": "222 22% 9%",
        "--popover-foreground": "210 20% 96%",

        "--primary": "174 72% 42%",
        "--primary-foreground": "222 22% 10%",

        "--secondary": "222 18% 14%",
        "--secondary-foreground": "210 20% 96%",

        "--muted": "222 18% 14%",
        "--muted-foreground": "215 16% 70%",

        "--accent": "199 78% 48%",
        "--accent-foreground": "222 22% 10%",

        "--destructive": "0 72% 52%",
        "--destructive-foreground": "210 20% 96%",

        "--border": "222 16% 18%",
        "--input": "222 16% 18%",
        "--ring": "174 72% 42%",

        "--radius": "0.75rem",

        "--chart-1": "174 72% 42%",
        "--chart-2": "199 78% 48%",
        "--chart-3": "43 96% 56%",
        "--chart-4": "152 58% 44%",
        "--chart-5": "0 72% 52%"
      },
      "supporting_tokens_to_add": {
        "--surface-1": "222 22% 9%",
        "--surface-2": "222 18% 12%",
        "--surface-3": "222 16% 16%",

        "--shadow-elev-1": "0 0% 0% / 0.35",
        "--shadow-elev-2": "0 0% 0% / 0.55",

        "--focus-outline": "174 72% 42%",

        "--status-pending": "43 96% 56%",
        "--status-approved": "152 58% 44%",
        "--status-rejected": "0 72% 52%",
        "--status-review": "199 78% 48%"
      }
    },

    "tailwind_usage": {
      "container": "mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8",
      "page_padding": "py-6 sm:py-8",
      "card": "rounded-xl border bg-card text-card-foreground shadow-[0_10px_30px_hsl(var(--shadow-elev-1))]",
      "card_subtle": "rounded-xl border bg-[hsl(var(--surface-2))] text-card-foreground",
      "hairline": "border-border/70",
      "focus_ring": "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--focus-outline))] focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    }
  },

  "typography": {
    "google_fonts": {
      "heading": {
        "name": "Space Grotesk",
        "weights": ["500", "600", "700"],
        "usage": "H1/H2, títulos de cards, números grandes (KPIs)"
      },
      "body": {
        "name": "Inter",
        "weights": ["400", "500", "600"],
        "usage": "UI general, tablas, formularios, textos largos"
      },
      "mono_optional": {
        "name": "IBM Plex Mono",
        "weights": ["400", "500"],
        "usage": "IDs de transacción, hashes, wallets, referencias"
      },
      "implementation_note": "En CRA: importar en public/index.html o via @import en index.css. Definir font-family en body y headings via clases Tailwind (font-[family])."
    },
    "scale": {
      "h1": "text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight",
      "h2": "text-base md:text-lg text-muted-foreground",
      "section_title": "text-xl sm:text-2xl font-semibold",
      "kpi_number": "text-2xl sm:text-3xl font-semibold tabular-nums",
      "body": "text-sm sm:text-base",
      "small": "text-xs sm:text-sm text-muted-foreground"
    },
    "number_formatting": {
      "rules": [
        "Usar tabular-nums en montos y tablas",
        "Moneda: USD o moneda configurable; mostrar separadores (1.234,56) según es-ES",
        "Mostrar comisiones explícitas: 25% estándar, 35% Top 10"
      ]
    }
  },

  "layout": {
    "global_structure": {
      "pattern": "App shell con sidebar + topbar (admin/roles) y layout público separado.",
      "sidebar": {
        "desktop": "Sidebar fija (w-72) con grupos y badges de conteo (pendientes).",
        "mobile": "Sheet/Drawer desde la izquierda con búsqueda rápida (Command).",
        "nav_style": "Íconos Lucide + label; item activo con fondo secondary y borde izquierdo en primary."
      },
      "topbar": {
        "elements": [
          "Breadcrumb",
          "buscador global (Command)",
          "switch de rol (si aplica)",
          "notificaciones (solo visual, sin WhatsApp)",
          "avatar + menú"
        ],
        "behavior": "Sticky en scroll dentro del main; sombra sutil al hacer scroll (no transición universal)."
      }
    },
    "grid_system": {
      "dashboard": "12 columnas en desktop; 4 en mobile. KPIs en 2x2 (mobile) y 4-up (desktop).",
      "tables": "Tabla full-width con filtros arriba; acciones a la derecha; paginación abajo.",
      "detail_pages": "Split: contenido principal (8) + panel lateral (4) para estados, timeline, acciones admin. En mobile: stack."
    },
    "information_hierarchy": {
      "admin_priority": [
        "Pendientes (Depósitos, Retiros, KYC, Entregables)",
        "Riesgo/alertas",
        "Resumen financiero",
        "Acciones rápidas"
      ],
      "marketplace_priority": [
        "Campañas disponibles",
        "Requisitos + presupuesto",
        "Estado de aplicación",
        "Entrega y revisión"
      ]
    }
  },

  "components": {
    "component_path": {
      "shadcn_primary": "/app/frontend/src/components/ui/",
      "use_components": [
        "button.jsx",
        "card.jsx",
        "badge.jsx",
        "table.jsx",
        "tabs.jsx",
        "dialog.jsx",
        "sheet.jsx",
        "dropdown-menu.jsx",
        "select.jsx",
        "input.jsx",
        "textarea.jsx",
        "calendar.jsx",
        "sonner.jsx",
        "pagination.jsx",
        "breadcrumb.jsx",
        "separator.jsx",
        "tooltip.jsx",
        "skeleton.jsx",
        "progress.jsx",
        "avatar.jsx",
        "command.jsx"
      ]
    },

    "core_patterns": {
      "status_badges": {
        "mapping": [
          {
            "status": "pendiente",
            "badge_classes": "bg-[hsl(var(--status-pending))]/15 text-[hsl(var(--status-pending))] border border-[hsl(var(--status-pending))]/30",
            "label": "Pendiente"
          },
          {
            "status": "aprobado",
            "badge_classes": "bg-[hsl(var(--status-approved))]/15 text-[hsl(var(--status-approved))] border border-[hsl(var(--status-approved))]/30",
            "label": "Aprobado"
          },
          {
            "status": "rechazado",
            "badge_classes": "bg-[hsl(var(--status-rejected))]/15 text-[hsl(var(--status-rejected))] border border-[hsl(var(--status-rejected))]/30",
            "label": "Rechazado"
          },
          {
            "status": "en_revision",
            "badge_classes": "bg-[hsl(var(--status-review))]/15 text-[hsl(var(--status-review))] border border-[hsl(var(--status-review))]/30",
            "label": "En revisión"
          }
        ],
        "note": "Siempre mostrar badge + timestamp relativo (hace 2h) en listas admin."
      },

      "money_blocks": {
        "kpi_card": {
          "structure": "Card > header (label + tooltip) > number grande > delta (Badge) > mini sparkline opcional",
          "classes": "p-4 sm:p-5",
          "data_testid_examples": [
            "admin-kpi-saldo-total",
            "admin-kpi-depositos-pendientes",
            "admin-kpi-retiros-pendientes"
          ]
        },
        "commission_display": {
          "pattern": "Inline callout en campañas y retiros: 'Comisión plataforma: 25% (Top 10: 35%)' con Tooltip explicativo.",
          "classes": "rounded-lg border bg-[hsl(var(--surface-2))] p-3 text-sm text-muted-foreground"
        }
      },

      "tables_admin": {
        "pattern": "Toolbar (filtros + búsqueda + rango de fechas) + Table + Pagination",
        "row_actions": "DropdownMenu con acciones: Ver detalle, Aprobar, Rechazar, Solicitar info, Marcar como pagado.",
        "empty_state": "Card con icono + texto + CTA (crear/filtrar).",
        "data_testid_examples": [
          "admin-deposits-table",
          "admin-deposits-search-input",
          "admin-deposits-status-filter",
          "admin-deposits-row-actions"
        ]
      },

      "forms": {
        "pattern": "Form shadcn (form.jsx) con Label + Input + helper text + error text.",
        "file_upload": "Para comprobantes: dropzone simple (div) + Input type=file oculto; mostrar preview y tamaño. Guardar estado 'subido' con Badge.",
        "kyc": "Stepper visual (Tabs o custom) con estados: Documento, Selfie, Dirección, Revisión."
      },

      "dialogs_and_confirmations": {
        "approve_reject": "AlertDialog para acciones irreversibles (aprobar/rechazar). Incluir resumen del ítem y monto.",
        "toasts": "Usar Sonner para feedback: 'Depósito aprobado', 'KYC rechazado: falta selfie'."
      }
    }
  },

  "page_blueprints": {
    "public": {
      "home_landing": {
        "layout": "Hero compacto (no más de 20% viewport con gradiente suave) + 3 pilares + marketplace preview + trust strip + FAQ.",
        "hero": {
          "headline": "Conecta marcas con creadores. Pagos verificados. Crecimiento real.",
          "sub": "Campañas, financiación musical, curadores de Spotify y suscripciones premium — todo con control administrativo.",
          "cta_primary": "Crear cuenta",
          "cta_secondary": "Explorar talentos",
          "visual": "Bento grid con 1 card de ranking Top 10 + 1 card de campaña + 1 card de depósito manual (mock UI)."
        }
      },
      "explore_creators": {
        "layout": "Grid de cards con filtros (categoría, país, rango, Top 10).",
        "card": "Avatar + nombre + categoría + métricas + badge Top 10 + CTA Ver perfil."
      },
      "rankings": {
        "layout": "Top 10 destacado (cards grandes) + tabla completa.",
        "note": "Mostrar regla de comisión 35% para Top 10 con Tooltip."
      },
      "auth": {
        "login_register": "Split layout: izquierda (beneficios + seguridad) derecha (form). En mobile: stack.",
        "role_selection": "RadioGroup: Anunciante / Creador / Fan."
      }
    },

    "admin": {
      "dashboard": {
        "sections": [
          "KPIs (saldo, comisiones, pendientes)",
          "Cola de pendientes (tabs: Depósitos, Retiros, KYC, Entregables)",
          "Actividad reciente (timeline)",
          "Riesgo/alertas (comprobantes duplicados, KYC vencido)"
        ],
        "interaction": "Cada item pendiente abre página detalle con panel lateral de acciones."
      },
      "deposits": {
        "table_columns": [
          "Usuario",
          "Método (Cripto/Banco)",
          "Monto",
          "Estado",
          "Fecha",
          "Acciones"
        ],
        "detail": "Preview comprobante + metadata + historial de cambios + botones Aprobar/Rechazar."
      },
      "withdrawals": {
        "note": "Bloquear acciones si KYC no aprobado. Mostrar banner de bloqueo con CTA a KYC."
      },
      "settings_wallet_bank": {
        "layout": "Cards separadas: Wallets cripto (por red) + Datos bancarios + Instrucciones para usuarios.",
        "copy": "Texto claro en español, con ejemplos de referencia/nota."
      }
    },

    "advertiser": {
      "dashboard": {
        "sections": [
          "Saldo + botón Depositar",
          "Campañas activas",
          "Entregables por revisar",
          "Historial de transacciones"
        ]
      },
      "create_campaign": {
        "form_sections": [
          "Objetivo + categoría",
          "Presupuesto + fechas (Calendar)",
          "Requisitos de entrega",
          "Criterios de aprobación",
          "Archivos de referencia"
        ]
      }
    },

    "creator": {
      "dashboard": {
        "sections": [
          "Ganancias + retiros",
          "Campañas recomendadas",
          "Aplicaciones en curso",
          "Estado KYC"
        ]
      },
      "deliverable_submit": {
        "pattern": "Formulario con URL + archivo + notas. Mostrar checklist de requisitos."
      },
      "premium_content": {
        "pattern": "Tabs: Suscriptores, Publicaciones, Ingresos."
      }
    },

    "fan": {
      "dashboard": {
        "sections": [
          "Explorar",
          "Suscripciones activas",
          "Feed premium"
        ]
      }
    }
  },

  "motion_and_microinteractions": {
    "library": {
      "recommended": "framer-motion",
      "install": "npm i framer-motion",
      "usage_notes": "Usar solo en contenedores y elementos clave (cards, sidebars, modals). Evitar animar tablas completas."
    },
    "principles": [
      "Duraciones: 160–220ms para hover/focus; 240–320ms para entrada de paneles",
      "Easing: cubic-bezier(0.2, 0.8, 0.2, 1)",
      "Hover cards: elevar sombra + borde más visible (no transform global)",
      "Botones: press scale 0.98 en active",
      "Sidebar mobile: Sheet con slide-in",
      "Skeletons en cargas de tablas y KPIs"
    ],
    "examples": {
      "card_hover_classes": "hover:border-border hover:shadow-[0_16px_40px_hsl(var(--shadow-elev-2))]",
      "button_motion": "active:scale-[0.98]"
    }
  },

  "data_visualization": {
    "library": {
      "recommended": "recharts",
      "install": "npm i recharts",
      "use_cases": [
        "Admin: depósitos vs retiros (línea)",
        "Comisiones por día (barra)",
        "Top categorías de campañas (donut)"
      ]
    },
    "chart_style": {
      "grid": "stroke: hsl(var(--border)) con opacidad 0.6",
      "tooltip": "Card pequeño bg-card border",
      "colors": [
        "hsl(var(--chart-1))",
        "hsl(var(--chart-2))",
        "hsl(var(--chart-3))",
        "hsl(var(--chart-4))",
        "hsl(var(--chart-5))"
      ]
    },
    "empty_states": "Si no hay datos, mostrar Skeleton + texto 'Aún no hay movimientos en este periodo'."
  },

  "accessibility": {
    "requirements": [
      "Contraste AA mínimo en dark theme (texto sobre surface-2)",
      "Focus visible siempre (ring token)",
      "Tamaños táctiles: min-h-10 en botones/inputs",
      "Estados no solo por color: incluir label + icono (Lucide)"
    ],
    "keyboard": [
      "Command palette accesible con Ctrl+K",
      "Tab order lógico en formularios",
      "Esc cierra Dialog/Sheet"
    ]
  },

  "testing_attributes": {
    "rule": "Todo elemento interactivo y toda info crítica debe incluir data-testid en kebab-case.",
    "examples": [
      "login-form-submit-button",
      "register-role-radio-creator",
      "admin-sidebar-nav-deposits",
      "admin-deposit-approve-button",
      "creator-withdrawal-request-button",
      "campaign-apply-button",
      "kyc-upload-document-input",
      "deposit-proof-upload-input",
      "rankings-top10-list"
    ]
  },

  "image_urls": {
    "creator_artist_portraits": [
      {
        "url": "https://images.unsplash.com/photo-1601233748556-fc899bd4305b?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85",
        "usage": "Landing hero bento (card de 'Creadores destacados') / placeholders de perfiles"
      },
      {
        "url": "https://images.unsplash.com/photo-1593840715437-4d7e132f7671?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85",
        "usage": "Sección 'Financiación musical' / perfil de artista"
      },
      {
        "url": "https://images.unsplash.com/photo-1719424728521-11acf97d3637?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85",
        "usage": "Cards de ranking Top 10 (imagen de cabecera)"
      },
      {
        "url": "https://images.unsplash.com/photo-1643488358907-f1efc5899f22?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85",
        "usage": "Sección 'Curadores de Spotify' / banner editorial"
      }
    ],
    "notes": "Evitar fotos con marcas visibles. Usar blurhash/skeleton mientras cargan."
  },

  "instructions_to_main_agent": {
    "theme_setup": [
      "Actualizar /app/frontend/src/index.css: reemplazar tokens .dark por recommended_dark_theme y agregar supporting_tokens_to_add.",
      "Eliminar estilos centrados del template CRA: NO usar .App { text-align:center }. App.css actual tiene header centrado; evitar usarlo en layout real.",
      "Asegurar que el root tenga className='dark' por defecto (o toggle futuro)."
    ],
    "js_files_note": "El proyecto usa .js/.jsx. Crear componentes en .jsx y páginas en .js. Mantener exports: componentes named export; páginas default export.",
    "admin_polish": [
      "Construir primero el Admin Shell (Sidebar + Topbar + Command palette) y luego tablas de pendientes.",
      "Implementar páginas detalle con panel lateral de acciones (approve/reject) usando Card + AlertDialog.",
      "Todas las tablas deben tener: búsqueda, filtro por estado, rango de fechas (Calendar), paginación."
    ],
    "copy_spanish": [
      "Usar español neutro LATAM.",
      "Estados consistentes: Pendiente / En revisión / Aprobado / Rechazado.",
      "Mensajes de dinero claros: 'Monto', 'Comisión', 'Total a pagar', 'Total a recibir'."
    ],
    "no_external_payments": "En depósitos/retiros, enfatizar UI de verificación manual: 'Sube tu comprobante' + 'Revisión por el equipo' + SLA estimado.",
    "icons": "Usar lucide-react (ya instalado). No emojis.",
    "references": {
      "inspiration_links": [
        "https://muz.li/blog/best-dashboard-design-examples-inspirations-for-2026/",
        "https://dribbble.com/search/fintech-dashboard",
        "https://dribbble.com/search/marketplace-dark-mode",
        "https://colorlib.com/wp/dark-admin-dashboard-templates/"
      ]
    }
  }
}

---

<General UI UX Design Guidelines>  
    - You must **not** apply universal transition. Eg: `transition: all`. This results in breaking transforms. Always add transitions for specific interactive elements like button, input excluding transforms
    - You must **not** center align the app container, ie do not add `.App { text-align: center; }` in the css file. This disrupts the human natural reading flow of text
   - NEVER: use AI assistant Emoji characters like`🤖🧠💭💡🔮🎯📚🎭🎬🎪🎉🎊🎁🎀🎂🍰🎈🎨🎰💰💵💳🏦💎🪙💸🤑📊📈📉💹🔢🏆🥇 etc for icons. Always use **FontAwesome cdn** or **lucid-react** library already installed in the package.json

 **GRADIENT RESTRICTION RULE**
NEVER use dark/saturated gradient combos (e.g., purple/pink) on any UI element.  Prohibited gradients: blue-500 to purple 600, purple 500 to pink-500, green-500 to blue-500, red to pink etc
NEVER use dark gradients for logo, testimonial, footer etc
NEVER let gradients cover more than 20% of the viewport.
NEVER apply gradients to text-heavy content or reading areas.
NEVER use gradients on small UI elements (<100px width).
NEVER stack multiple gradient layers in the same viewport.

**ENFORCEMENT RULE:**
    • Id gradient area exceeds 20% of viewport OR affects readability, **THEN** use solid colors

**How and where to use:**
   • Section backgrounds (not content backgrounds)
   • Hero section header content. Eg: dark to light to dark color
   • Decorative overlays and accent elements only
   • Hero section with 2-3 mild color
   • Gradients creation can be done for any angle say horizontal, vertical or diagonal

- For AI chat, voice application, **do not use purple color. Use color like light green, ocean blue, peach orange etc**

</Font Guidelines>

- Every interaction needs micro-animations - hover states, transitions, parallax effects, and entrance animations. Static = dead. 
   
- Use 2-3x more spacing than feels comfortable. Cramped designs look cheap.

- Subtle grain textures, noise overlays, custom cursors, selection states, and loading animations: separates good from extraordinary.
   
- Before generating UI, infer the visual style from the problem statement (palette, contrast, mood, motion) and immediately instantiate it by setting global design tokens (primary, secondary/accent, background, foreground, ring, state colors), rather than relying on any library defaults. Don't make the background dark as a default step, always understand problem first and define colors accordingly
    Eg: - if it implies playful/energetic, choose a colorful scheme
           - if it implies monochrome/minimal, choose a black–white/neutral scheme

**Component Reuse:**
	- Prioritize using pre-existing components from src/components/ui when applicable
	- Create new components that match the style and conventions of existing components when needed
	- Examine existing components to understand the project's component patterns before creating new ones

**IMPORTANT**: Do not use HTML based component like dropdown, calendar, toast etc. You **MUST** always use `/app/frontend/src/components/ui/ ` only as a primary components as these are modern and stylish component

**Best Practices:**
	- Use Shadcn/UI as the primary component library for consistency and accessibility
	- Import path: ./components/[component-name]

**Export Conventions:**
	- Components MUST use named exports (export const ComponentName = ...)
	- Pages MUST use default exports (export default function PageName() {...})

**Toasts:**
  - Use `sonner` for toasts"
  - Sonner component are located in `/app/src/components/ui/sonner.tsx`

Use 2–4 color gradients, subtle textures/noise overlays, or CSS-based noise to avoid flat visuals.
</General UI UX Design Guidelines>
