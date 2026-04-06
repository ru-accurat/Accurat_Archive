# Accurat Archive — User Guide

## What is Accurat Archive?

Accurat Archive is a web application for managing Accurat's project portfolio. It stores project metadata, media galleries, case study texts, financial engagement records, and provides tools for browsing, filtering, sharing, and exporting projects.

Access it at: **https://accurat-archive.vercel.app/**

---

## Getting Started

### Logging In

1. Go to the application URL
2. Enter your email and password on the login page
3. You'll be redirected to the main project index

Your account has one of three roles:
- **Admin** — full access to all features including settings and user management
- **Editor** — can create, edit, and delete projects, manage collections and tags
- **Viewer** — read-only access to browse and search the archive

---

## Browsing Projects

### The Project Index (Home Page)

The home page shows all projects in the archive. You can switch between two views using the toggle in the toolbar:

**Table View**
- Displays projects as rows with sortable columns: Client, Project, Unit, Tier, Year, Category, and Completeness
- Click any column header to sort ascending/descending
- Use arrow keys to navigate between rows
- Click a row to open the project detail page

**Grid View**
- Displays projects as visual cards showing hero images
- Scroll to browse the gallery
- Click any card to open the project detail

### Searching

Type in the search bar at the top to search across multiple fields simultaneously: client name, project name, description, tagline, category, team members, domains, and services. Results filter instantly as you type.

### Filtering

Use the filter sidebar to narrow down projects by:

- **Domains** — select one or more domains (e.g., "Data Visualization", "AI/ML")
- **Services** — select one or more services (e.g., "Design", "Development")
- **Category** — filter by output type (e.g., "Interactive", "Print", "Installation")
- **Section** — filter by studio unit
- **Tier** — filter by project importance (Tier 1 = featured, Tier 2 = highlighted, Tier 3 = standard)
- **Year Range** — set minimum and/or maximum year
- **Status** — filter by draft, internal, or public
- **Completeness** — filter for projects missing descriptions or missing media

All filters combine (AND logic). Active filters show a count of matching results. Click "Clear filters" to reset.

### Selecting Multiple Projects

- Click the checkbox on each project row to select it
- Use the "Select All" checkbox in the header to select all visible projects
- Once projects are selected, the **Bulk Actions** bar appears

---

## Project Detail Page

Click any project to open its detail page. The page shows:

### View Mode

- **Hero Image** — large feature image at the top
- **Metadata Bar** — tier badge, studio unit, year range, status
- **Gallery** — ordered grid of all project media (images, videos, GIFs)
- **Case Study Sections** — tagline, description, challenge, solution, deliverables, client quotes
- **Tags** — domain and service tags displayed as chips
- **Team** — list of team members
- **URLs** — links to live project, press coverage, etc.
- **Related Projects** — automatically suggested similar projects based on shared clients, domains, and services
- **Linked Engagements** — associated business/financial records

### Edit Mode

Click the **Edit** button to enter edit mode. In edit mode:

**Editing Text Fields**
- Click any text field to edit it inline
- Fields include: tagline, description, challenge, solution, deliverables, client quotes
- Changes are saved when you click **Save**

**Editing Metadata**
- Use dropdown menus to change: tier, section, status, year range, output category
- Edit the client name, project name, or full name directly

**Editing Tags**
- Click on domain or service tag areas to add/remove tags
- Tags autocomplete from existing taxonomy
- New tags are created automatically when typed

**Editing URLs**
- Add, remove, or reorder project URLs
- Each URL can have a custom label

**Editing Team**
- Add or remove team member names

**Managing Media**
- **Upload**: drag and drop files or click the upload button. Supports images (JPG, PNG, WebP, HEIC, AVIF), videos (MP4, WebM, MOV), and GIFs
- **Reorder**: drag and drop media items to change their display order
- **Set Hero/Thumbnail**: click the star icon on any image to set it as the hero image; click the thumbnail icon to set it as the grid thumbnail
- **Delete**: select media items and click delete (supports batch delete)
- Uploaded HEIC and AVIF images are automatically converted to WebP

**Managing PDFs**
- Upload PDF documents associated with the project
- Rename or delete existing PDFs

**Managing Client Logo**
- Upload or replace the client's logo image
- Delete the current logo

**AI Content Generation**
- Click the AI sparkle icon on any text field to generate content using Claude
- Supported fields: tagline, description, challenge, solution, deliverables
- After generation, a diff view shows proposed changes — accept or reject
- AI-generated fields are marked with a subtle indicator

**Project History**
- Click the history icon to view previous versions of the project
- Each save creates a snapshot
- Click any snapshot to preview it; click "Restore" to revert to that version

### Creating a New Project

1. Click the **+ New Project** button in the toolbar
2. Enter the client name and project name (the project ID is auto-generated)
3. The project is created as a draft
4. You're taken to the detail page in edit mode to fill in content

### Deleting a Project

1. Open the project detail page
2. In edit mode, click the delete button
3. Confirm deletion — this removes the project and all its media permanently

---

## Collections

Collections are curated groups of projects, useful for organizing presentations, pitch decks, or themed selections.

### Creating a Collection

1. Navigate to **Collections** in the sidebar
2. Click **+ New Collection**
3. Name your collection and optionally add a description

### Adding Projects to a Collection

**From the project index:**
1. Select projects using checkboxes
2. Click **Add to Collection** in the bulk actions bar
3. Choose an existing collection or create a new one

**From the collection page:**
1. Open a collection
2. Click **Add Projects**
3. Search and select projects to add

### Reordering Projects in a Collection

Drag and drop project cards within a collection to change their display order.

### Sharing a Collection

1. Open a collection
2. Click **Share**
3. A unique share link is generated
4. Anyone with the link can view the collection (no login required)

---

## Timeline View

Navigate to **Timeline** in the sidebar to see projects plotted on a horizontal timeline.

- Each project appears as a bar spanning its start/end years
- Bars are color-coded by studio unit
- Scroll horizontally to navigate through years
- Click any bar to open the project detail

---

## Map View

Navigate to **Map** in the sidebar to see projects with geographic coordinates plotted on an interactive map.

- Projects appear as markers on a black-and-white map
- Nearby projects are clustered — zoom in to separate them
- Click a marker or cluster to see project details
- Only projects with latitude/longitude data appear on the map

---

## Tag Management

Navigate to **Tags** in the sidebar to manage the taxonomy.

### Viewing Tags

Tags are organized into three categories:
- **Domains** — thematic areas (e.g., "Data Visualization", "Climate")
- **Services** — capabilities (e.g., "Design", "Development", "Research")
- **Outputs** — deliverable types (e.g., "Interactive", "Print", "Installation")

Each tag shows how many projects use it.

### Renaming a Tag

1. Click the edit icon next to a tag
2. Type the new name
3. The tag is renamed across all projects that use it

### Merging Tags

1. Select two tags to merge
2. Choose which tag name to keep
3. All projects using the removed tag are updated to use the kept tag

---

## Engagements

Navigate to **Engagements** in the sidebar to manage business/financial records.

### Viewing Engagements

Engagements are financial records listing:
- Year
- Client name
- Project name
- Amounts in EUR and/or USD
- Notes
- Linked archive projects

### Creating Engagements

1. Click **+ New Engagement**
2. Fill in year, client, project name, and amounts
3. Save

### Importing Engagements from CSV

1. Click **Import CSV**
2. Upload a CSV file with engagement data
3. Preview the parsed rows — the system auto-matches client names
4. Confirm to apply the import
5. The import is tracked as a batch for potential undo

### Linking Engagements to Projects

1. Open an engagement record
2. Click **Link Project**
3. Search for and select archive projects to associate
4. Links are bidirectional — they also appear on the project detail page

### Client Management

- Clients are automatically created from engagement records
- View a client's page to see total revenue breakdown by year
- Merge duplicate clients to consolidate records
- Add aliases so the system recognizes variant spellings

---

## Sharing & Public Portfolio

### Share Links (Individual Projects)

1. Open any project detail page
2. Click the **Share** button
3. A unique URL is generated (e.g., `/share/abc123`)
4. Anyone with this link can view the project without logging in
5. You can revoke the link at any time

### Shared Collections

1. Open a collection
2. Click **Share** to generate a public link
3. The link shows the collection with all its projects in order

### Public Portfolio

Projects with status set to **"public"** appear on the public portfolio page at `/portfolio`. This page is accessible without login and shows a browsable grid of published projects.

---

## Bulk Operations

### CSV Export

1. Select projects (or select all)
2. Click **Export CSV** in the bulk actions bar
3. A CSV file downloads with all project metadata

### ZIP Export

1. Select projects
2. Click **Export ZIP**
3. A ZIP file downloads containing project data and media files

### CSV Import

1. From the toolbar, click **Import CSV**
2. Upload a CSV file matching the expected column format
3. Preview the parsed data and field mappings
4. Confirm to create or update projects from the CSV

### Bulk Edit

1. Select multiple projects
2. Use bulk actions to:
   - Add all selected projects to a collection
   - Change status of all selected projects

---

## Activity Log

Navigate to **Activity** in the sidebar to see a chronological feed of all changes:

- Project created
- Project updated (shows which fields changed)
- Project deleted

Each entry shows the timestamp and details of the change. Use this to audit who changed what and when.

---

## Settings

Navigate to **Settings** in the sidebar.

### User Profile
- Update your display name
- View your role

### AI Configuration
- Configure the API key for AI content generation
- Adjust AI generation preferences

---

## Keyboard Shortcuts

The application supports keyboard navigation for power users:

| Shortcut | Action |
|----------|--------|
| Arrow Up/Down | Navigate between projects in table view |
| Enter | Open selected project |
| Escape | Close modal / exit edit mode |
| Cmd/Ctrl + K | Focus search bar |

---

## Tips & Best Practices

1. **Start with metadata**: Fill in client, project name, tier, section, year, domains, and services first — these power search and filtering
2. **Use AI generation**: For case study text (description, challenge, solution), use the AI button to generate a first draft, then refine
3. **Set hero images**: Choose a strong hero image for each project — it appears in grid view and share links
4. **Tag consistently**: Use the Tags page to keep taxonomy clean — merge duplicates and rename for consistency
5. **Track completeness**: Use the completeness filter to find projects missing key information and gradually fill gaps
6. **Use collections for presentations**: Before a pitch, create a collection with relevant projects in your preferred order, then share the collection link
7. **Check the activity log**: If something looks wrong, check the activity log and use project history to restore previous versions
