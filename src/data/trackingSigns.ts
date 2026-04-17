export interface TrackingSign {
  id: number;
  nameZh: string;
  nameEn: string;
  description: string;
  isWarning?: boolean; // 警告符號不需順序觸發
}

export const trackingSigns: TrackingSign[] = [
  { id:1, nameZh:'沿路前進', nameEn:'This Way', description:'箭頭指示前進方向。用樹枝或石子排成箭頭。' },
  { id:2, nameZh:'繼續直行', nameEn:'Straight On', description:'繼續沿當前方向前進，不需要轉向。' },
  { id:3, nameZh:'此路不通', nameEn:'Wrong Way', description:'兩根樹枝交叉成X形，此路不通！', isWarning:true },
  { id:4, nameZh:'已回家', nameEn:'Gone Home', description:'石子圍成圓圈中央一點，追蹤結束。' },
  { id:5, nameZh:'前方有水', nameEn:'Water Ahead', description:'樹枝排成波浪形，前方有水源。' },
  { id:6, nameZh:'左轉', nameEn:'Turn Left', description:'箭頭向左彎曲，在此處向左轉。' },
  { id:7, nameZh:'右轉', nameEn:'Turn Right', description:'箭頭向右彎曲，在此處向右轉。' },
  { id:8, nameZh:'前方障礙', nameEn:'Obstacle', description:'平行線加橫線，前方有障礙需繞道。', isWarning:true },
  { id:9, nameZh:'步數信物', nameEn:'Paces to Message', description:'方格加箭頭，沿方向走指定步數可找到信物。' },
  { id:10, nameZh:'分途前進', nameEn:'Split Path', description:'箭頭分叉，隊伍分開行進。' },
];

export function getSignById(id:number):TrackingSign|undefined { return trackingSigns.find(s=>s.id===id); }
export function getRandomSigns(count:number):TrackingSign[] { return [...trackingSigns].sort(()=>Math.random()-0.5).slice(0,count); }
export function getWrongOptions(correct:TrackingSign, count=3):TrackingSign[] {
  return trackingSigns.filter(s=>s.id!==correct.id).sort(()=>Math.random()-0.5).slice(0,count);
}
