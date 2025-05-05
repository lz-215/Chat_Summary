/**
 * 停用词列表
 * 用于文本分析时过滤掉常见但无意义的词
 */

// 英文停用词
const english = [
    'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and',
    'any', 'are', 'aren\'t', 'as', 'at', 'be', 'because', 'been', 'before', 'being',
    'below', 'between', 'both', 'but', 'by', 'can\'t', 'cannot', 'could', 'couldn\'t',
    'did', 'didn\'t', 'do', 'does', 'doesn\'t', 'doing', 'don\'t', 'down', 'during',
    'each', 'few', 'for', 'from', 'further', 'had', 'hadn\'t', 'has', 'hasn\'t', 'have',
    'haven\'t', 'having', 'he', 'he\'d', 'he\'ll', 'he\'s', 'her', 'here', 'here\'s',
    'hers', 'herself', 'him', 'himself', 'his', 'how', 'how\'s', 'i', 'i\'d', 'i\'ll',
    'i\'m', 'i\'ve', 'if', 'in', 'into', 'is', 'isn\'t', 'it', 'it\'s', 'its', 'itself',
    'let\'s', 'me', 'more', 'most', 'mustn\'t', 'my', 'myself', 'no', 'nor', 'not',
    'of', 'off', 'on', 'once', 'only', 'or', 'other', 'ought', 'our', 'ours', 'ourselves',
    'out', 'over', 'own', 'same', 'shan\'t', 'she', 'she\'d', 'she\'ll', 'she\'s',
    'should', 'shouldn\'t', 'so', 'some', 'such', 'than', 'that', 'that\'s', 'the',
    'their', 'theirs', 'them', 'themselves', 'then', 'there', 'there\'s', 'these',
    'they', 'they\'d', 'they\'ll', 'they\'re', 'they\'ve', 'this', 'those', 'through',
    'to', 'too', 'under', 'until', 'up', 'very', 'was', 'wasn\'t', 'we', 'we\'d',
    'we\'ll', 'we\'re', 'we\'ve', 'were', 'weren\'t', 'what', 'what\'s', 'when',
    'when\'s', 'where', 'where\'s', 'which', 'while', 'who', 'who\'s', 'whom', 'why',
    'why\'s', 'with', 'won\'t', 'would', 'wouldn\'t', 'you', 'you\'d', 'you\'ll',
    'you\'re', 'you\'ve', 'your', 'yours', 'yourself', 'yourselves',
    // 聊天常见词
    'ok', 'okay', 'hi', 'hello', 'hey', 'bye', 'goodbye', 'yes', 'no', 'yeah',
    'thanks', 'thank', 'please', 'sorry', 'lol', 'haha', 'hmm', 'um', 'oh',
    'like', 'just', 'get', 'got', 'going', 'go', 'went', 'come', 'came', 'coming',
    'know', 'knew', 'knowing', 'see', 'saw', 'seeing', 'think', 'thought', 'thinking',
    'say', 'said', 'saying', 'tell', 'told', 'telling', 'want', 'wanted', 'wanting',
    'need', 'needed', 'needing', 'use', 'used', 'using', 'try', 'tried', 'trying',
    'call', 'called', 'calling', 'work', 'worked', 'working', 'time', 'times',
    'day', 'days', 'week', 'weeks', 'month', 'months', 'year', 'years',
    'today', 'tomorrow', 'yesterday', 'now', 'later', 'soon', 'then'
];

// 中文停用词
const chinese = [
    '的', '了', '和', '是', '就', '都', '而', '及', '与', '这', '那', '有', '在',
    '我', '你', '他', '她', '它', '们', '个', '们', '为', '以', '于', '上', '下',
    '不', '也', '很', '但', '还', '又', '或', '所', '因', '由', '如', '何', '之',
    '已', '被', '所', '这样', '那样', '如此', '只是', '只有', '还有', '虽然', '因为',
    '所以', '如果', '就是', '这个', '那个', '这些', '那些', '一个', '一些', '一样',
    '一直', '一定', '一般', '一种', '一次', '一会', '一点', '一下', '一天', '一年',
    '可以', '可能', '应该', '需要', '一起', '一共', '一边', '一面', '一旦', '一切',
    '一时', '一来', '一番', '一阵', '一批', '一群', '一对', '一双', '一半', '一部分',
    // 聊天常见词
    '嗯', '啊', '哦', '呵', '呀', '哈', '哎', '唉', '嘿', '嘻', '呢', '吧', '啦',
    '呗', '哇', '哟', '喂', '嗨', '嗯嗯', '哈哈', '呵呵', '嘻嘻', '嘿嘿', '好的',
    '谢谢', '对不起', '没关系', '不客气', '再见', '拜拜', '回头见', '晚安', '早安',
    '早上好', '中午好', '下午好', '晚上好', '好久不见', '最近好吗', '怎么样', '还好吗'
];

module.exports = {
    english,
    chinese
};
