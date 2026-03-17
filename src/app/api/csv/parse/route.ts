import { NextResponse } from 'next/server'
import Papa from 'papaparse'

// POST /api/csv/parse — parse a CSV file and return headers + preview rows
export async function POST(request: Request) {
  const formData = await request.formData()
  const file = formData.get('file')

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  const text = await file.text()
  const { data, errors, meta } = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  })

  if (errors.length > 0) {
    console.warn('CSV parse warnings:', errors.slice(0, 5))
  }

  return NextResponse.json({
    headers: meta.fields || [],
    rows: data,
    rowCount: data.length,
  })
}
