// 可选依赖：未安装 @supabase/supabase-js 时自动退化为仅用 localStorage，不报错
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

let _client: any = null;

/** 是否配置了 Supabase 环境变量（若已安装包则会使用云端） */
export const isSupabaseConfigured = () => !!(supabaseUrl && supabaseAnonKey);

/** 懒加载 Supabase 客户端；未安装包或未配置时返回 null */
export async function getSupabase(): Promise<any> {
  if (_client) return _client;
  if (!supabaseUrl || !supabaseAnonKey) return null;
  try {
    const { createClient } = await import('@supabase/supabase-js');
    _client = createClient(supabaseUrl, supabaseAnonKey);
    return _client;
  } catch (e) {
    console.warn('Supabase 未安装或加载失败，将仅使用本地存储。若需云端同步请执行: npm install @supabase/supabase-js', e);
    return null;
  }
}

/** 兼容旧用法：同步时无法确定是否可用，仅根据环境变量判断 */
export const supabase = null;
