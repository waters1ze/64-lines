import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as Blob

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const imgbbFormData = new FormData()
    imgbbFormData.append('image', file)

    const apiKey = process.env.IMGBB_API_KEY || '723c05b071d7b40c8930e629eeb66a52'
    
    const res = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
      method: 'POST',
      body: imgbbFormData,
    })

    const data = await res.json()

    if (!res.ok) {
      return NextResponse.json({ error: data.error?.message || 'Upload failed' }, { status: 500 })
    }

    return NextResponse.json({ url: data.data.url })
  } catch (error) {
    console.error('Upload Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
