export const voiceTags = ['透明感', 'ハスキー', '低音', '高音', 'やさしい', '力強い', 'ささやき系', '爽やか', '元気'];
export function lpIntro(roles) {
  if (roles.includes('singer') && roles.includes('organizer')) return '歌い手としての活動やMIX・動画編集のサービスと、主催するライブのコンセプト。両方の魅力を伝える専用LPを、プロフィールに掲載しませんか？';
  if (roles.includes('singer')) return '歌い手としての活動や、MIX・動画編集のスキルをもっと伝える専用ページをご希望の方へ。';
  return 'ライブのコンセプトや主催者としての活動を紹介するLPを、プロフィールに掲載しませんか？ LP制作は、運営者のだうくへご相談ください。';
}
export function tagDisabled(checked, count) { return !checked && count >= 5; }
export function validFlyer(file) {
  return ['image/jpeg', 'image/png', 'image/webp'].includes(file.type) && file.size <= 10 * 1024 * 1024;
}
export function allowedPanels(roles) {
  return { profile: true, video: roles.includes('singer'), live: roles.includes('singer') || roles.includes('organizer'), manage:true };
}
