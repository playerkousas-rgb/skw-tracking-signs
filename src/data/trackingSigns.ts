export interface TrackingSign {
  id: number;
  nameZh: string;
  nameEn: string;
  description: string;
  /** 實物畫法：點樣用樹枝／石頭排喺地上 */
  layout: string;
  action: string;
  isWarning?: boolean;
  category: 'direction' | 'warning' | 'info' | 'end';
  needsDirection?: boolean;
  needsPaces?: boolean;
}

export const trackingSigns: TrackingSign[] = [
  {
    id: 1, nameZh: '沿此路前進', nameEn: 'This Way',
    description: '箭頭指向應前進的方向。用樹枝或石子在地上排出箭頭形狀，箭頭尖端指向正確路線。',
    layout: '用一根長樹枝做箭桿，兩根短枝斜放做箭頭；箭尖要指向正確路線。',
    action: '跟隨箭頭方向繼續前進',
    category: 'direction',
  },
  {
    id: 2, nameZh: '繼續直行', nameEn: 'Straight On',
    description: '兩條平行線表示沿當前方向繼續直行，不需轉向。',
    layout: '兩根樹枝平行橫放（相距約一隻手掌），同前進方向成直角。',
    action: '保持當前方向繼續直行',
    category: 'direction',
  },
  {
    id: 3, nameZh: '此路不通', nameEn: 'Wrong Way / Danger',
    description: '兩根樹枝交叉成「X」形，表示此路不通或有危險，切勿進入。',
    layout: '兩根樹枝交叉成 X，交叉點用石仔壓實，唔好俾風吹散。',
    action: '立即停止，回頭尋找正確路線',
    category: 'warning',
    isWarning: true,
  },
  {
    id: 4, nameZh: '已回家', nameEn: 'Gone Home',
    description: '石子圍成圓圈，中央放一顆石子。追蹤路線結束，找到最終信物。',
    layout: '八至十粒石仔圍成圓圈，中央再放一粒較大嘅石。',
    action: '追蹤結束，領取信物返回基地',
    category: 'end',
  },
  {
    id: 5, nameZh: '前方有水', nameEn: 'Water Ahead',
    description: '樹枝排成波浪形「〜」，配箭頭指示哪個方向前方有水源。',
    layout: '三至四根樹枝排成連續波浪「〜」，末端加箭頭指向水源。',
    action: '注意箭頭方向前方有水，小心前進',
    category: 'info',
    needsDirection: true,
  },
  {
    id: 6, nameZh: '左轉', nameEn: 'Turn Left',
    description: '箭頭明顯向左彎曲。在路口或轉彎處指示應向左轉。',
    layout: '長枝向前，末端屈向左成 L 形，再加箭頭指左。',
    action: '在此處向左轉',
    category: 'direction',
  },
  {
    id: 7, nameZh: '右轉', nameEn: 'Turn Right',
    description: '箭頭明顯向右彎曲。在路口或轉彎處指示應向右轉。',
    layout: '長枝向前，末端屈向右成 L 形，再加箭頭指右。',
    action: '在此處向右轉',
    category: 'direction',
  },
  {
    id: 8, nameZh: '前方障礙', nameEn: 'Obstacle Ahead',
    description: '平行線上加橫線，配箭頭指示哪個方向有障礙物，需要繞道。',
    layout: '兩條平行線中間加一橫（似一道閘），旁邊箭頭指向繞行方向。',
    action: '箭頭方向有障礙，尋找繞道路線',
    category: 'warning',
    isWarning: true,
    needsDirection: true,
  },
  {
    id: 9, nameZh: '信物在前', nameEn: 'Message / Caches This Way',
    description: '方格加上箭頭，箭頭指向藏有信物或訊息的方向，方格內數字表示步數。',
    layout: '四根樹枝圍成方格，格內放相同數目嘅短枝代表步數，再加箭頭。',
    action: '沿箭頭方向走指定步數尋找信物',
    category: 'info',
    needsDirection: true,
    needsPaces: true,
  },
  {
    id: 10, nameZh: '分途前進', nameEn: 'Split Path',
    description: '箭頭在主幹分叉成兩個方向，表示隊伍應在此分組前進。',
    layout: '主幹向前，分叉成 Y 形，兩邊各加一個箭頭。',
    action: '隊伍分組，按指示方向分頭前進',
    category: 'direction',
  },
];

export function getSignById(id: number): TrackingSign | undefined {
  return trackingSigns.find(s => s.id === id);
}

export function getSignsByCategory(cat: TrackingSign['category']): TrackingSign[] {
  return trackingSigns.filter(s => s.category === cat);
}

// 保留給舊頁面過渡用（QuizPage / PlayPage），刪除舊頁面後可移除
export function getRandomSigns(count: number): TrackingSign[] {
  return [...trackingSigns].sort(() => Math.random() - 0.5).slice(0, count);
}

export function getWrongOptions(correct: TrackingSign, count = 3): TrackingSign[] {
  return trackingSigns
    .filter(s => s.id !== correct.id)
    .sort(() => Math.random() - 0.5)
    .slice(0, count);
}
