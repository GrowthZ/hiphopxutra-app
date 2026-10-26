import { getAccessToken } from './firebase';
import { Dancer, Judge, Team2v2, BattleMatch } from '../types/tournament';

export interface SyncResult {
  success: boolean;
  message: string;
  spreadsheetUrl?: string;
  spreadsheetId?: string;
}

export async function createTournamentSpreadsheet(
  title: string,
  newbieDancers: Dancer[],
  proDancers: Dancer[],
  teams: Team2v2[],
  judges: Judge[]
): Promise<SyncResult> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Chưa đăng nhập Google Workspace. Vui lòng bấm "Đăng nhập Google" trước.');
  }

  try {
    // 1. Create spreadsheet structure
    const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: {
          title: `${title} - Hệ Thống Chấm Điểm U16`,
        },
        sheets: [
          { properties: { title: 'PRELIM_NEWBIE_1VS1', gridProperties: { frozenRowCount: 1 } } },
          { properties: { title: 'PRELIM_PRO_2VS2', gridProperties: { frozenRowCount: 1 } } },
          { properties: { title: 'DOI_PRO_2VS2', gridProperties: { frozenRowCount: 1 } } },
          { properties: { title: 'BATTLE_RESULTS', gridProperties: { frozenRowCount: 1 } } },
          { properties: { title: 'DANH_SACH_GIAM_KHAO', gridProperties: { frozenRowCount: 1 } } },
        ],
      }),
    });

    if (!createRes.ok) {
      const errJson = await createRes.json();
      throw new Error(errJson.error?.message || 'Không thể tạo Google Sheet mới');
    }

    const sheetData = await createRes.json();
    const spreadsheetId = sheetData.spreadsheetId;
    const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

    // 2. Populate initial data
    await syncAllTournamentData(spreadsheetId, newbieDancers, proDancers, teams, judges, []);

    return {
      success: true,
      message: 'Tạo Google Sheet giải đấu thành công!',
      spreadsheetId,
      spreadsheetUrl,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Lỗi không xác định khi kết nối Google Sheets';
    return {
      success: false,
      message,
    };
  }
}

export async function syncAllTournamentData(
  spreadsheetId: string,
  newbieDancers: Dancer[],
  proDancers: Dancer[],
  teams: Team2v2[],
  judges: Judge[],
  matches: BattleMatch[]
): Promise<SyncResult> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Chưa đăng nhập Google Workspace. Vui lòng đăng nhập tài khoản Google.');
  }

  try {
    // Headers for Prelim
    const judgeHeaders = judges.map((j) => j.code);
    const prelimHeader = ['Hạng', 'SBD', 'Tên Thí Sinh', 'CLB / Đội', 'Tuổi', ...judgeHeaders, 'Tổng Điểm', 'Điểm TB', 'Kết Quả'];

    const formatPrelimRows = (dancers: Dancer[]) => {
      return dancers.map((d, index) => {
        const jScores = judges.map((j) => d.prelimScores[j.id] ?? '');
        return [
          index + 1,
          d.sbd,
          d.name,
          d.crew || '',
          d.age,
          ...jScores,
          d.prelimScoreTotal,
          d.prelimScoreAvg,
          d.isQualifiedTop32 ? 'Top 32' : 'Ngoài Top 32',
        ];
      });
    };

    const newbieRows = [prelimHeader, ...formatPrelimRows(newbieDancers)];
    const proRows = [prelimHeader, ...formatPrelimRows(proDancers)];

    // Teams rows
    const teamsHeader = ['Số Đội', 'Tên Đội', 'Dancer 1 (SBD)', 'Tên Dancer 1', 'Dancer 2 (SBD)', 'Tên Dancer 2'];
    const teamsRows = [
      teamsHeader,
      ...teams.map((t) => [
        t.teamNumber,
        t.name,
        t.dancer1.sbd,
        t.dancer1.name,
        t.dancer2.sbd,
        t.dancer2.name,
      ]),
    ];

    // Judges rows
    const judgesHeader = ['Mã GK', 'Tên Giám Khảo', 'Trạng Thái'];
    const judgesRows = [
      judgesHeader,
      ...judges.map((j) => [j.code, j.name, j.isOnline ? 'Đang kết nối' : 'Ngoại tuyến']),
    ];

    // Battles rows
    const battleHeader = ['Mã Trận', 'Hạng Mục', 'Vòng Đấu', 'Góc Đỏ', 'Tỉ Số', 'Góc Xanh', 'Người Thắng', 'Trạng Thái'];
    const battleRows = [
      battleHeader,
      ...matches.map((m) => [
        m.id,
        m.category === 'newbie_1v1' ? 'Newbie 1vs1' : 'Pro 2vs2',
        m.stageName,
        m.sideRed.name,
        `${m.roundWinsRed} - ${m.roundWinsBlue}`,
        m.sideBlue.name,
        m.winnerSide === 'red' ? m.sideRed.name : m.winnerSide === 'blue' ? m.sideBlue.name : 'Chưa có',
        m.status === 'finished' ? 'Đã hoàn thành' : m.status === 'ongoing' ? 'Đang diễn ra' : 'Sắp diễn ra',
      ]),
    ];

    // Batch update
    const updatePayload = {
      valueInputOption: 'USER_ENTERED',
      data: [
        { range: 'PRELIM_NEWBIE_1VS1!A1:N100', values: newbieRows },
        { range: 'PRELIM_PRO_2VS2!A1:N100', values: proRows },
        { range: 'DOI_PRO_2VS2!A1:F50', values: teamsRows },
        { range: 'DANH_SACH_GIAM_KHAO!A1:C20', values: judgesRows },
        { range: 'BATTLE_RESULTS!A1:H100', values: battleRows },
      ],
    };

    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatePayload),
      }
    );

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message || 'Không thể đồng bộ dữ liệu vào Google Sheet');
    }

    return {
      success: true,
      message: 'Đồng bộ toàn bộ dữ liệu vào Google Sheet thành công!',
      spreadsheetId,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Lỗi đồng bộ Google Sheets';
    return {
      success: false,
      message,
    };
  }
}

// Export CSV string for backup or offline usage
export function exportToCSV(data: (string | number)[][]): string {
  return data
    .map((row) =>
      row
        .map((val) => {
          const str = String(val ?? '').replace(/"/g, '""');
          return `"${str}"`;
        })
        .join(',')
    )
    .join('\n');
}

export function downloadCSV(filename: string, content: string) {
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
