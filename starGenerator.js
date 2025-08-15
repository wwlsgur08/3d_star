// 🤖 AI 별자리 자동 생성 로직
class StarGenerator {
    constructor() {
        // 매력별 키워드 매핑
        this.charmKeywords = {
            '계획성': ['체계적인', '신중한', '준비된', '계획적인'],
            '책임감': ['신뢰할 수 있는', '든든한', '책임감 있는', '의무감 강한'],
            '성실함': ['묵묵한', '꾸준한', '성실한', '진실한'],
            '창의성': ['창의적인', '독창적인', '혁신적인', '상상력 풍부한'],
            '열정': ['뜨거운', '열정적인', '에너지 넘치는', '활기찬'],
            '공감 능력': ['따뜻한', '공감하는', '이해심 깊은', '마음이 넓은'],
            '리더십': ['이끄는', '카리스마 있는', '지도력 있는', '선도하는'],
            '분위기 메이커': ['활기를 주는', '즐거운', '밝은', '유쾌한'],
            '사교적 에너지': ['친화력 있는', '소통하는', '어울리는', '사람을 좋아하는'],
            '모험심': ['도전하는', '모험을 즐기는', '용감한', '개척하는'],
            '야망': ['꿈이 큰', '포부가 있는', '목표가 명확한', '야심찬'],
            '통찰력': ['지혜로운', '깊이 보는', '통찰력 있는', '예리한'],
            '침착함': ['평온한', '차분한', '안정감 있는', '침착한'],
            '진정성': ['진실한', '솔직한', '꾸밈없는', '있는 그대로의'],
            '배려심': ['세심한', '배려 깊은', '친절한', '다정한'],
            '포용력': ['너그러운', '포용하는', '아우르는', '감싸안는'],
            '경청 능력': ['귀 기울이는', '들어주는', '이해하려는', '소통하는'],
            '인내심': ['끈기 있는', '참을성 있는', '지구력 있는', '버텨내는'],
            '용기': ['용기 있는', '담대한', '두려워하지 않는', '과감한'],
            '겸손': ['겸손한', '낮은 자세의', '배우려는', '소박한'],
            '안정감': ['안정적인', '평안한', '든든한', '신뢰감 주는']
        };

        // 별 타입별 접미사
        this.starSuffixes = ['별', '별자리', '성좌', '천체', '성운'];
        
        // 설명 템플릿
        this.descriptionTemplates = [
            "당신의 {charm1}과/와 {charm2}이/가 {positive_effect}",
            "{charm1}으로/로 {action1}하고, {charm2}으로/로 {action2}하는 {personality_type}",
            "{charm1}과/와 {charm2}을/를 겸비한 당신은 {achievement}을/를 이루어냅니다",
            "당신만의 {charm1}이/가 {impact}을/를 가져다주며, {charm2}으로/로 {result}"
        ];
    }

    // 매력 점수 배열을 받아서 별명과 설명 자동 생성
    generateStar(charmScores) {
        // charmScores는 {매력명: 점수} 형태의 객체
        const topCharms = this.getTopCharms(charmScores, 3); // 상위 3개 매력 추출
        const starName = this.generateStarName(topCharms);
        const description = this.generateDescription(topCharms, charmScores);
        const comment = this.generateComment(topCharms);
        
        return {
            name: starName,
            simpleDescription: description,
            charms: this.formatCharms(charmScores),
            comment: comment
        };
    }

    // 상위 N개 매력 추출 (점수 높은 순)
    getTopCharms(charmScores, count = 3) {
        return Object.entries(charmScores)
            .sort(([,a], [,b]) => b - a)
            .slice(0, count)
            .map(([charm, score]) => ({charm, score}));
    }

    // 별명 생성 로직
    generateStarName(topCharms) {
        const primary = topCharms[0].charm; // 가장 높은 점수 매력
        const secondary = topCharms[1] ? topCharms[1].charm : null;
        
        const primaryKeyword = this.getRandomKeyword(primary);
        const suffix = this.getRandomElement(this.starSuffixes);
        
        // 패턴 1: "형용사 + 매력명 + 별"
        if (Math.random() > 0.5 && secondary) {
            const secondaryKeyword = this.getRandomKeyword(secondary);
            return `${primaryKeyword} ${secondaryKeyword.replace('적인', '').replace('한', '').replace('있는', '')} ${suffix}`;
        }
        
        // 패턴 2: "형용사 + 별"
        return `${primaryKeyword} ${primary.replace('성', '').replace('력', '').replace('심', '')}의 ${suffix}`;
    }

    // 간단한 설명 생성
    generateDescription(topCharms) {
        const primary = topCharms[0].charm;
        const secondary = topCharms[1] ? topCharms[1].charm : null;
        
        const primaryKeyword = this.getRandomKeyword(primary);
        const action = this.getCharmAction(primary);
        
        if (secondary) {
            const secondaryKeyword = this.getRandomKeyword(secondary);
            return `${primaryKeyword.replace('한', '함').replace('있는', '음')}과 ${secondaryKeyword.replace('한', '함').replace('있는', '음')}으로 ${action} 별`;
        }
        
        return `${primaryKeyword.replace('한', '함').replace('있는', '음')}으로 ${action} 별`;
    }

    // 상세 코멘트 생성
    generateComment(topCharms) {
        const primary = topCharms[0].charm;
        const secondary = topCharms[1] ? topCharms[1].charm : null;
        
        const comments = [
            `당신의 뛰어난 ${primary}이/가 주변 사람들에게 큰 영감을 줍니다.`,
            `${primary}과/와 ${secondary || '진정성'}을/를 겸비한 당신은 특별한 존재입니다.`,
            `당신만의 ${primary}이/가 세상을 더 아름답게 만들어갑니다.`,
            `${primary}으로/로 가득한 당신의 마음이 모두에게 희망을 전해줍니다.`,
            `당신의 ${primary}이/가 만들어내는 긍정적인 에너지가 놀라울 따름입니다.`
        ];
        
        return this.getRandomElement(comments);
    }

    // 매력별 대표 행동 정의
    getCharmAction(charm) {
        const actions = {
            '계획성': '체계적으로 미래를 준비하는',
            '책임감': '신뢰를 쌓아가는',
            '성실함': '꾸준히 노력하는',
            '창의성': '새로운 가능성을 여는',
            '열정': '에너지를 발산하는',
            '공감 능력': '마음을 이어주는',
            '리더십': '앞장서서 이끄는',
            '분위기 메이커': '즐거움을 나누는',
            '모험심': '새로운 도전을 즐기는',
            '야망': '큰 꿈을 향해 나아가는',
            '통찰력': '깊이 있게 바라보는',
            '진정성': '진실된 모습으로 살아가는'
        };
        
        return actions[charm] || '자신만의 길을 걸어가는';
    }

    // 매력 리스트를 별점 형태로 포맷
    formatCharms(charmScores) {
        return Object.entries(charmScores)
            .sort(([,a], [,b]) => b - a) // 점수 높은 순으로 정렬
            .map(([charm, score]) => `${charm} ★${score}`);
    }

    // 헬퍼 메서드들
    getRandomKeyword(charm) {
        const keywords = this.charmKeywords[charm] || ['특별한'];
        return this.getRandomElement(keywords);
    }

    getRandomElement(array) {
        return array[Math.floor(Math.random() * array.length)];
    }
}

// 사용 예시:
// const generator = new StarGenerator();
// const result = generator.generateStar({
//     '창의성': 6,
//     '열정': 6, 
//     '호기심': 5,
//     '모험심': 4
// });
// console.log(result);

module.exports = { StarGenerator };