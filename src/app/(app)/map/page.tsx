'use client'

import { useProjects } from '@/hooks/use-projects'
import { useProjectStore } from '@/stores/project-store'
import { useEffect, useRef, useMemo, useState } from 'react'
import type { Project } from '@/lib/types'
import 'maplibre-gl/dist/maplibre-gl.css'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

/** Group projects by identical lat/lng into location clusters */
function clusterByLocation(projects: Project[]) {
  const map = new Map<string, Project[]>()
  for (const p of projects) {
    const key = `${p.latitude},${p.longitude}`
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(p)
  }
  return Array.from(map.values())
}

function escapeHtml(str: string) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export default function MapPage() {
  const { loading } = useProjects()
  const projects = useProjectStore((s) => s.projects)
  const mapContainer = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<any[]>([])
  const [mapReady, setMapReady] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [mgl, setMgl] = useState<any>(null)

  const geoProjects = useMemo(
    () => projects.filter((p) => p.latitude != null && p.longitude != null),
    [projects]
  )

  const clusters = useMemo(() => clusterByLocation(geoProjects), [geoProjects])

  // Dynamically import maplibre-gl (browser only)
  useEffect(() => {
    let cancelled = false
    async function loadMapLibre() {
      const mod = await import('maplibre-gl')
      if (!cancelled) setMgl(mod.default || mod)
    }
    loadMapLibre()
    return () => { cancelled = true }
  }, [])

  // Initialize map once library and container are ready
  useEffect(() => {
    if (!mgl || loading || !mapContainer.current) return

    // Clean up previous map if any
    if (mapRef.current) {
      mapRef.current.remove()
      mapRef.current = null
      setMapReady(false)
    }

    const map = new mgl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          carto: {
            type: 'raster',
            tiles: [
              'https://a.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}@2x.png',
              'https://b.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}@2x.png',
              'https://c.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}@2x.png',
            ],
            tileSize: 256,
            attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
          },
        },
        layers: [{ id: 'carto', type: 'raster', source: 'carto' }],
      },
      center: [12.5, 42],
      zoom: 3,
    })

    map.addControl(new mgl.NavigationControl(), 'top-right')
    mapRef.current = map

    map.on('load', () => setMapReady(true))

    return () => {
      map.remove()
      mapRef.current = null
      setMapReady(false)
    }
  }, [mgl, loading])

  // Add markers when map is ready and projects change
  useEffect(() => {
    const map = mapRef.current
    if (!mgl || !map || !mapReady || clusters.length === 0) return

    // Clear existing markers
    markersRef.current.forEach((m) => m.remove())
    markersRef.current = []

    clusters.forEach((group) => {
      const first = group[0]
      const lng = first.longitude!
      const lat = first.latitude!
      const locationName = first.locationName || ''
      const count = group.length

      // Build popup HTML
      let popupHtml: string

      if (count === 1) {
        // Single project
        const p = first
        const thumb = p.thumbImage || p.heroImage
        const imgUrl = thumb
          ? `${SUPABASE_URL}/storage/v1/object/public/project-media/${p.folderName}/${thumb}`
          : null
        popupHtml = `
          <div style="font-family:Inter,system-ui,sans-serif;">
            <a href="/project/${p.id}" style="text-decoration:none;color:inherit;display:block;cursor:pointer;">
              ${imgUrl ? `<img src="${imgUrl}" style="width:100%;height:80px;object-fit:cover;border-radius:3px;margin-bottom:6px;" />` : ''}
              <div style="font-size:12px;font-weight:500;color:#1a1a1a;">${escapeHtml(p.client)}</div>
              <div style="font-size:11px;color:#666;">${escapeHtml(p.projectName)}</div>
            </a>
            ${locationName ? `<div style="font-size:10px;color:#999;margin-top:2px;">${escapeHtml(locationName)}</div>` : ''}
          </div>
        `
      } else {
        // Multiple projects at same location
        const listItems = group.map((p) => `
          <a href="/project/${p.id}" style="display:block;padding:5px 0;border-bottom:1px solid #eee;text-decoration:none;color:inherit;cursor:pointer;transition:background .15s;"
             onmouseover="this.style.background='#f5f5f5'" onmouseout="this.style.background='transparent'">
            <div style="font-size:11px;font-weight:500;color:#1a1a1a;">${escapeHtml(p.client)}</div>
            <div style="font-size:10px;color:#666;">${escapeHtml(p.projectName)}</div>
          </a>
        `).join('')

        popupHtml = `
          <div style="font-family:Inter,system-ui,sans-serif;">
            ${locationName ? `<div style="font-size:11px;font-weight:500;color:#1a1a1a;margin-bottom:6px;padding-bottom:6px;border-bottom:2px solid #1a1a1a;">${escapeHtml(locationName)}</div>` : ''}
            <div style="font-size:10px;color:#999;margin-bottom:4px;">${count} projects</div>
            <div style="max-height:240px;overflow-y:auto;">
              ${listItems}
            </div>
          </div>
        `
      }

      const popup = new mgl.Popup({ offset: 25, maxWidth: '280px' }).setHTML(popupHtml)

      // Custom black marker element
      const el = document.createElement('div')
      el.style.width = count > 1 ? '24px' : '16px'
      el.style.height = count > 1 ? '24px' : '16px'
      el.style.borderRadius = '50%'
      el.style.backgroundColor = '#1a1a1a'
      el.style.border = '2px solid #fff'
      el.style.boxShadow = '0 1px 4px rgba(0,0,0,0.3)'
      el.style.cursor = 'pointer'
      el.style.transition = 'transform 0.15s ease'
      el.addEventListener('mouseenter', () => { el.style.transform = 'scale(1.2)' })
      el.addEventListener('mouseleave', () => { el.style.transform = 'scale(1)' })

      if (count > 1) {
        el.style.display = 'flex'
        el.style.alignItems = 'center'
        el.style.justifyContent = 'center'
        el.style.fontSize = '9px'
        el.style.fontWeight = '600'
        el.style.color = '#fff'
        el.textContent = String(count)
      }

      const marker = new mgl.Marker({ element: el })
        .setLngLat([lng, lat])
        .setPopup(popup)
        .addTo(map)

      markersRef.current.push(marker)
    })

    // Fit bounds
    if (geoProjects.length > 1) {
      const bounds = new mgl.LngLatBounds()
      geoProjects.forEach((p) => bounds.extend([p.longitude!, p.latitude!]))
      map.fitBounds(bounds, { padding: 60 })
    } else if (geoProjects.length === 1) {
      map.setCenter([geoProjects[0].longitude!, geoProjects[0].latitude!])
      map.setZoom(10)
    }
  }, [mgl, geoProjects, clusters, mapReady])

  if (loading || !mgl) {
    return (
      <div className="flex items-center justify-center h-full bg-[var(--c-white)] text-[var(--c-gray-400)] text-[13px]">
        Loading map...
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-var(--topbar-h))] bg-[var(--c-white)]">
      <div className="px-4 sm:px-6 md:px-[48px] pt-5 pb-3 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-[1.1rem] font-[350] tracking-[-0.01em] text-[var(--c-gray-900)]">Map</h1>
          <p className="text-[12px] text-[var(--c-gray-400)] mt-1">
            {geoProjects.length} project{geoProjects.length !== 1 ? 's' : ''} across {clusters.length} location{clusters.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>
      <div className="flex-1 relative min-h-0">
        <div className="absolute inset-0">
          <div ref={mapContainer} className="w-full h-full" />
        </div>
      </div>
    </div>
  )
}
