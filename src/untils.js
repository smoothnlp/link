/**
 * 去除掉标签
 *
 * @export
 * @param {*} content
 * @returns
 */
export function stripTags(content) {
//   console.log('strip tag', content);
  if (!content) {
    return;
  }
  const text = typeof content !== 'object' ? content : content.text;

  return text.replace(/<\/?.+?>/g, '');
}

/**
 * 生成UUID
 *
 * @export
 * @param {string} [rawid='']
 * @returns
 */
export function guid(rawid = '') {
  rawid = rawid || 'xyxxxxxyx';
  const formatter = rawid + '-xxxyxxx-xxxxxxxx';

  return formatter.replace(/[xy]/g, function (c) {
    var r = Math.random() * 16 | 0,
        v = c == 'x' ? r : (r & 0x3 | 0x8);

    return v.toString(16);
  });
}

/**
 *根据特定格式格式化时间
 *
 * @export
 * @param {*} fmt
 * @param {*} date
 * @returns
 */
export function dateFormat(fmt, date) {
  let ret;
  const opt = {
    'Y+': date.getFullYear().toString(), // 年
    'm+': (date.getMonth() + 1).toString(), // 月
    'd+': date.getDate().toString(), // 日
    'H+': date.getHours().toString(), // 时
    'M+': date.getMinutes().toString(), // 分
    'S+': date.getSeconds().toString(), // 秒
    // 有其他格式化字符需求可以继续添加，必须转化成字符串
  };

  for (const k in opt) {
    ret = new RegExp('(' + k + ')').exec(fmt);
    if (ret) {
      fmt = fmt.replace(ret[1], (ret[1].length == 1) ? (opt[k]) : (opt[k].padStart(ret[1].length, '0')));
    }
  }

  return fmt;
}

export default {
  guid,
  stripTags,
  dateFormat,
};