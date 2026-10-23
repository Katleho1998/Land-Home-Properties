export type StaffRole = 'admin' | 'staff' | 'editor' | 'viewer';
export type StaffProfile = {user_id:string; role:StaffRole; display_name:string; email:string; phone:string; job_title:string};
export const adminSections = ['Finance','Compliance','Reports','Marketing','Settings','Team'];
export function canOpenSection(role:StaffRole, section:string) { return role === 'admin' || !adminSections.includes(section); }
export function roleLabel(role:StaffRole) { return role === 'admin' ? 'Admin' : role === 'viewer' ? 'Staff · read only' : 'Staff'; }
export function initials(name:string) { return name.trim().split(/\s+/).slice(0,2).map(s=>s[0]).join('').toUpperCase() || 'LH'; }
