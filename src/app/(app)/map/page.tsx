'use client'

import { useProjects } from '@/hooks/use-projects'
import { useProjectStore } from '@/stores/project-store'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useMemo } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

export default function MapPage() {
  const { loading } = useProjects()
  const projects = useProjectStore((s) => s.projects)
  const router = useRouter()
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)

  const geoProjects = useMemo(
    () => projects.filter((p) => p.latitude != null && p.longitude != null),
    [projects]
  )

  useEffect(() => {
    if (loading || !mapContainer.current || mapRef.current) return

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '&copy; OpenStreetMap contributors',
          },
        },
        layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
      },
      center: [12.5, 42],
      zoom: 3,
    })

    map.addControl(new maplibregl.NavigationControl(), 'top-right')

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [loading])

  // Add markers when projects change
  useEffect(() => {
    const map = mapRef.current
    if (!map || geoProjects.length === 0) return

    // Wait for map to load
    const addMarkers = () => {
      geoProjects.forEach((p) => {
        const thumb = p.thumbImage || p.heroImage
        const imgUrl = thumb
          ? `${SUPABASE_URL}/storage/v1/object/public/project-media/${p.folderName}/${thumb}`
          : null

        const popup = new maplibregl.Popup({ offset: 25, maxWidth: '240px' }).setHTML(`
          <div style="font-family: Inter, sans-serif; cursor: pointer;" onclick="window.location.href='/project/${p.id}'">
            ${imgUrl ? `<img src="${imgUrl}" style="width:100%;height:80px;object-fit:cover;border-radius:3px;margin-bottom:6px;" />` : ''}
            <div style="font-size:12px;font-weight:500;color:#1a1a1a;">${p.client}</div>
            <div style="font-size:11px;color:#666;">${p.projectName}</div>
            ${p.locationName ? `<div style="font-size:10px;color:#999;margin-top:2px;">${p.locationName}</div>` : ''}
          </div>
        `)

        new maplibregl.Marker({ color: '#3b82f6' })
          .setLngLat([p.longitude!, p.latitude!])
          .setPopup(popup)
          .addTo(map)
      })

      // Fit bounds if there are markers
      if (geoProjects.length > 1) {
        const bounds = new maplibregl.LngLatBounds()
        geoProjects.forEach((p) => bounds.extend([p.longitude!, p.latitude!]))
        map.fitBounds(bounds, { padding: 60 })
      } else if (geoProjects.length === 1) {
        map.setCenter([geoProjects[0].longitude!, geoProjects[0].latitude!])
        map.setZoom(10)
      }
    }

    if (map.loaded()) {
      addMarkers()
    } else {
      map.on('load', addMarkers)
    }
  }, [geoProjects])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-[var(--c-white)] text-[var(--c-gray-400)] text-[13px]">
        Loading...
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-[var(--c-white)]">
      <div className="px-4 sm:px-6 md:px-[48px] pt-5 pb-3 flex items-center justify-between">
        <div>
          <h1 className="text-[1.1rem] font-[350] tracking-[-0.01em] text-[var(--c-gray-900)]">Map</h1>
          <p className="text-[12px] text-[var(--c-gray-400)] mt-1">
            {geoProjects.length} project{geoProjects.length !== 1 ? 's' : ''} with locations
          </p>
        </div>
      </div>
      <div className="flex-1 relative">
        <div ref={mapContainer} className="absolute inset-0" />
      </div>
    </div>
  )
}
