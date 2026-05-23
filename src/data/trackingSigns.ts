export interface TrackingSign {
  id: number;
  nameZh: string;
  nameEn: string;
  description: string;
  action: string;        // What the scout should DO when seeing this sign
  isWarning?: boolean;
  category: 'direction' | 'warning' | 'info' | 'end';
}

export const trackingSigns: TrackingSign[] = [
  {
    id: 1, nameZh: '沿此路前進', nameEn: 'This Way',
    description: '箭頭指向應前進的方向。用樹枝或石子在地上排出箭頭形狀，箭頭尖端指向正確路線。',
    action: '跟隨箭頭方向繼續前進',
    category: 'direction',
  },
  {
    id: 2, nameZh: '繼續直行', nameEn: 'Straight On',
    description: '兩條平行線表示沿當前方向繼續直行，不需轉向。通常放在確認直行的路段。',
    action: '保持當前方向繼續直行',
    category: 'direction',
  },
  {
    id: 3, nameZh: '此路不通', nameEn: 'Wrong Way / Danger',
    description: '兩根樹枝交叉成「X」形，表示此路不通或有危險，切勿進入。是重要的警告標記。',
    action: '立即停止，回頭尋找正確路線',
    category: 'warning',
    isWarning: true,
  },
  {
    id: 4, nameZh: '已回家', nameEn: 'Gone Home',
    description: '石子圍成圓圈，中央放一顆石子。表示追蹤路線結束，活動完成，可以返回集合點。',
    action: '追蹤結束，返回基地',
    category: 'end',
  },
  {
    id: 5, nameZh: '前方有水', nameEn: 'Water Ahead',
    description: '樹枝排成波浪形「〜」，表示前方有水源（河流、溪澗或水站）。提醒注意安全。',
    action: '注意前方有水，小心前進',
    category: 'info',
  },
  {
    id: 6, nameZh: '左轉', nameEn: 'Turn Left',
    description: '箭頭明顯向左彎曲。在路口或轉彎處指示應向左轉。',
    action: '在此處向左轉',
    category: 'direction',
  },
  {
    id: 7, nameZh: '右轉', nameEn: 'Turn Right',
    description: '箭頭明顯向右彎曲。在路口或轉彎處指示應向右轉。',
    action: '在此處向右轉',
    category: 'direction',
  },
  {
    id: 8, nameZh: '前方障礙', nameEn: 'Obstacle Ahead',
    description: '平行線上加橫線，表示前方有障礙物（如倒樹、大石），需要繞道而行。',
    action: '前方有障礙，尋找繞道路線',
    category: 'warning',
    isWarning: true,
  },
  {
    id: 9, nameZh: '信物在前', nameEn: 'Message / Caches This Way',
    description: '方格加上箭頭，箭頭指向藏有信物或訊息的方向，方格內的數字表示需要走多少步。',
    action: '沿箭頭方向走指定步數尋找信物',
    category: 'info',
  },
  {
    id: 10, nameZh: '分途前進', nameEn: 'Split Path',
    description: '箭頭在主幹分叉成兩個方向，表示隊伍應在此分組，各組沿不同路線前進。',
    action: '隊伍分組，按指示方向分頭前進',
    category: 'direction',
  },
];

export function getSignById(id: number): TrackingSign | undefined {
  return trackingSigns.find(s => s.id === id);
}

export function getRandomSigns(count: number): TrackingSign[] {
  return [...trackingSigns].sort(() => Math.random() - 0.5).slice(0, count);
}

export function getWrongOptions(correct: TrackingSign, count = 3): TrackingSign[] {
  return trackingSigns
    .filter(s => s.id !== correct.id)
    .sort(() => Math.random() - 0.5)
    .slice(0, count);
}

export function getSignsByCategory(cat: TrackingSign['category']): TrackingSign[] {
  return trackingSigns.filter(s => s.category === cat);
}
