# 🤖 Aki - Tu Asistente de IA con Herramientas

<div align="center">

![Aki Chat Interface](./screenshot.png)

**Un asistente de IA potenciado por Ollama con capacidades de manipulación de archivos y ejecución de comandos**

[![Astro](https://img.shields.io/badge/Astro-6.4.2-FF5D01?style=flat&logo=astro&logoColor=white)](https://astro.build)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat)](LICENSE)

</div>

---

## 📖 Descripción

Aki es un asistente de IA conversacional que puede interactuar con tu sistema de archivos y ejecutar comandos de forma segura. Construido con tecnologías modernas como Astro, React y TypeScript, ofrece una interfaz web intuitiva para comunicarte con modelos de IA locales.

### ✨ Características Principales

- 🗂️ **Manipulación de Archivos**: Leer, escribir, listar y buscar archivos
- 💻 **Ejecución de Comandos**: Ejecuta comandos de shell de forma segura
- 🔒 **Sandbox Seguro**: Operaciones limitadas a un directorio de trabajo
- 🚀 **Streaming en Tiempo Real**: Respuestas de IA transmitidas en vivo
- 💭 **Modo de Pensamiento**: Visualiza el razonamiento del modelo
- 🎨 **Interfaz Moderna**: UI limpia con soporte para tema oscuro
- 🔧 **Herramientas Disponibles**: 9 herramientas integradas para el agente

---

## 🛠️ Tecnologías

| Tecnología | Propósito |
|------------|-----------|
| **Astro** | Framework web full-stack |
| **React 19** | UI components |
| **TypeScript** | Tipado estático |
| **Ollama** | API de IA local |
| **Drizzle ORM** | Base de datos SQLite |
| **Tailwind CSS** | Estilos |
| **shadcn/ui** | Componentes UI |
| **Vitest** | Testing |
| **Biome** | Linting y formateo |

---

## 📋 Requisitos Previos

- **Node.js** >= 22.12.0
- **pnpm** (gestor de paquetes)
- **Ollama** instalado y ejecutándose
- **API Key de Ollama Cloud** (opcional)

---

## 🚀 Instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/beresiartejuan/aki.git
cd aki
```

### 2. Instalar dependencias

```bash
pnpm install
```

### 3. Configurar variables de entorno

Crea un archivo `.env` en la raíz del proyecto:

```env
# Base de datos
DB_PATH=./data/aki.db

# API de Ollama
OLLAMA_API_KEY=tu_api_key_aqui
OLLAMA_MODEL=qwen3.5

# Directorio de trabajo
WORKSPACE_ROOT=./workspace
```

### 4. Inicializar la base de datos

```bash
pnpm db:generate
pnpm db:migrate
node --import=tsx scripts/init-db.ts
```

### 5. Iniciar el servidor de desarrollo

```bash
pnpm dev
```

¡Listo! Abre tu navegador en `http://localhost:4321`

---

## 💻 Comandos Disponibles

| Comando | Descripción |
|---------|-------------|
| `pnpm dev` | Inicia el servidor de desarrollo |
| `pnpm build` | Compila para producción |
| `pnpm preview` | Vista previa del build |
| `pnpm test` | Ejecuta los tests |
| `pnpm test:ui` | Tests con interfaz gráfica |
| `pnpm lint` | Ejecuta el linter |
| `pnpm format` | Formatea el código |
| `pnpm check` | Lint + formato + organización de imports |
| `pnpm db:studio` | Abre Drizzle Studio |
| `pnpm db:generate` | Genera migraciones |
| `pnpm db:migrate` | Aplica migraciones |

---

## 📁 Estructura del Proyecto

```text
aki/
├── src/
│   ├── components/        # Componentes React
│   │   ├── chat/          # Componentes del chat
│   │   └── ui/            # Componentes UI base
│   ├── db/                # Esquemas y consultas DB
│   │   ├── queries/       # Funciones de consulta
│   │   ├── schema.ts      # Esquema Drizzle
│   │   └── seed.ts        # Datos iniciales
│   ├── lib/               # Lógica del servidor
│   │   ├── agent.ts       # Bucle del agente
│   │   ├── tools/         # Herramientas del agente
│   │   │   ├── definitions.ts
│   │   │   ├── executor.ts
│   │   │   ├── filesystem.ts
│   │   │   ├── sandbox.ts
│   │   │   ├── security.ts
│   │   │   └── shell.ts
│   │   ├── ollama.ts      # Cliente Ollama
│   │   └── constants.ts   # Constantes
│   ├── pages/             # Páginas Astro
│   │   └── api/           # Endpoints API
│   ├── styles/            # Estilos globales
│   └── env.ts             # Variables de entorno
├── data/                  # Base de datos SQLite
├── workspace/             # Directorio de trabajo del agente
├── public/                # Archivos estáticos
└── scripts/               # Scripts de utilidad
```

---

## 🔧 Herramientas del Agente

El agente tiene acceso a las siguientes herramientas para interactuar con el sistema:

### Sistema de Archivos
- `read_file` - Leer contenido de archivos
- `write_file` - Escribir contenido en archivos
- `list_directory` - Listar contenido de directorios
- `create_directory` - Crear directorios
- `delete_file` - Eliminar archivos
- `delete_directory` - Eliminar directorios
- `move_file` - Mover/renombrar archivos
- `search_files` - Buscar archivos por patrón

### Shell
- `run_command` - Ejecutar comandos en el workspace

---

## 🔒 Seguridad

### Sandbox de Archivos
- Todas las operaciones están limitadas al directorio `WORKSPACE_ROOT`
- Validación automática de rutas para prevenir acceso no autorizado
- Límites de tamaño: archivos > 100KB se truncarán

### Ejecución de Comandos
- Lista de comandos bloqueados (rm -rf /, sudo, curl, etc.)
- Timeout automático de 15 segundos
- Output limitado a 8000 caracteres

---

## 🧪 Testing

El proyecto incluye un conjunto comprehensivo de tests unitarios:

```bash
# Ejecutar todos los tests
pnpm test

# Tests con interfaz gráfica
pnpm test:ui

# Tests en modo watch
pnpm test -- --watch
```

---

## 🤝 Contribuir

¡Las contribuciones son bienvenidas! Por favor, sigue estos pasos:

1. Haz fork del proyecto
2. Crea una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. Haz commit de tus cambios (`git commit -m 'Agrega nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

### Estándares de Código

- Ejecuta `pnpm check` antes de hacer commit
- Todos los tests deben pasar
- El código debe seguir las reglas de Biome
- Mantén la cobertura de tests

---

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo [LICENSE](LICENSE) para más detalles.

---

## 🙏 Agradecimientos

- [Ollama](https://ollama.ai) por proporcionar acceso a modelos de IA locales
- [Astro](https://astro.build) por el excelente framework full-stack
- [shadcn/ui](https://ui.shadcn.com) por los componentes hermosos
- [Biome](https://biomejs.dev) por las herramientas de calidad de código

---

<div align="center">

**Hecho con ❤️ por [Beresiarte](https://github.com/beresiartejuan)**

</div>