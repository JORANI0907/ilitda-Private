import { google } from 'googleapis'

function getDriveClient() {
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  if (!key) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON 환경변수가 설정되지 않았습니다.')

  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(key),
    scopes: ['https://www.googleapis.com/auth/drive'],
  })
  return google.drive({ version: 'v3', auth })
}

// 폴더 생성 (parentId 없으면 루트에 생성)
async function createFolder(name: string, parentId?: string): Promise<string> {
  const drive = getDriveClient()
  const res = await drive.files.create({
    requestBody: {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: parentId ? [parentId] : undefined,
    },
    fields: 'id',
  })
  const folderId = res.data.id
  if (!folderId) throw new Error('Drive 폴더 생성에 실패했습니다.')
  return folderId
}

// Gmail로 폴더 편집 권한 공유
async function shareFolder(folderId: string, gmail: string): Promise<void> {
  const drive = getDriveClient()
  await drive.permissions.create({
    fileId: folderId,
    requestBody: { role: 'writer', type: 'user', emailAddress: gmail },
    sendNotificationEmail: true,
  })
}

// 업체 루트 폴더 생성 및 공유 (없으면 새로 생성)
export async function createAndShareBusinessFolder(
  businessName: string,
  gmail: string,
): Promise<string> {
  const drive = getDriveClient()

  // "일잇다" 루트 폴더 찾기 (service account drive 내)
  const search = await drive.files.list({
    q: `name='일잇다' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id)',
  })
  let rootId = search.data.files?.[0]?.id
  if (!rootId) rootId = await createFolder('일잇다')

  // 업체명 하위 폴더 생성
  const bizFolder = await createFolder(businessName, rootId)

  // Gmail로 공유
  await shareFolder(bizFolder, gmail)

  return bizFolder
}

// 고객 서브폴더 생성 (신청서 단위)
export async function createClientSubfolder(
  parentFolderId: string,
  clientName: string,
  date: string,
): Promise<string> {
  const folderName = `${clientName}_${date}`
  const folderId = await createFolder(folderName, parentFolderId)
  return folderId
}
