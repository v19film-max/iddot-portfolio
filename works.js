/* iddot — Work 상세 창에 들어가는 작업별 정보.
   작업 목록 카드와 상세 창을 모두 이 파일에서 만든다 (리뉴얼 시안). 새 작업은 여기에 한 덩어리만 추가하면 된다.

   항목 설명 (비어 있으면 상세 창에서 그 줄은 표시하지 않는다)
   - title    : 상세 창 제목
   - artist   : 제목 아래 회색 한 줄 (아티스트 / 채널명)
   - category : 분류 표기 (예: 'M/V · Performance Video')
   - cats     : 분류 탭 ['mv' | 'film' | 'art' | 'digital'] (여러 개 가능)
   - selected : true 면 첫 화면 기본 목록(SELECTED)에 나온다 (위에서부터 순서대로)
   - hideInAll: true 면 ALL 탭에서는 숨기고 해당 분류 탭에서만 보인다
   - poster   : 카드 썸네일. 비우면 유튜브 썸네일을 쓴다
   - preview  : 카드에 마우스를 올렸을 때 재생할 짧은 무음 영상 (선택)
   - youtube  : 유튜브 영상 ID. 있으면 상세 창에서 유튜브 플레이어로 재생한다.
   - embed    : false 로 두면 사이트 안에서 유튜브를 재생하지 않고 미리보기 + 'YouTube에서 보기' 버튼을 보여준다.
                (유튜브가 '볼 수 없음'을 띄우는 영상용. 안 적어도 오류가 나면 자동으로 같은 화면으로 바뀐다.)
   - video    : 유튜브가 없을 때 재생할 사이트 내 영상 경로
   - client   : 클라이언트
   - role     : iddot 이 맡은 역할
   - credits  : [['Director', '이름'], ['DOP', '이름'], ...] 순서대로 표시
   - note     : 작업 설명 한두 문장 (선택)

   주의: 크레딧은 실제로 확인된 것만 넣는다. 공개해도 되는 이름인지 확인할 것. */
window.IDDOT_WORKS = {
  'sdf-onward-super-kids': {
    title: '[STREET WORLD FIGHTER : DIRECTORS’ WAR - SUPER KIDS] "ONWARD"',
    artist: '백구영 & 베이비주 & 캐스퍼',
    category: 'M/V · Performance Video',
    cats: ['mv'], selected: true,
    youtube: '5cKGtDHWPRY',
    client: '',
    role: '1ST AD / CREATIVE TEAM',
    credits: [
      ["STREET WORLD FIGHTER : DIRECTORS’ WAR - SUPER KIDS"],
      ["Production", "RIGEND CREATIVE"],
      ["Creative Director", "RIMA YOON"],
      ["Director", "RIMA YOON (@rimayoon_sr)\nx\nKOOYOUNG BACK, BABYZOO, KASPER"],
      ["Creative & Visual Team", "RIG.RIG.RIG (@ri9.ri9.ri9)\nSEUNGMIN YIM, YEJIN AN, YONGHWI JEONG, EUNYOUNG CHO"],
      ["Executive Producer", "SUYEON PARK"],
      ["Producer", "SUJUNG JANG"],
      ["Line Producer", "NAYOUNG KIM, HWANHEE OH"],
      ["1st Assistant Director", "SEUNGMIN YIM, YEJIN AN, SEOYOUNG YOON"],
      ["2nd Assistant Director", "KYUNGHWAN JI, MISEONG KIM"],
      ["DOP", "SHIN JAM (SCENE JAM)"],
      ["Focus Puller", "JUN KIM"],
      ["2nd AC", "SEONGMIN HONG"],
      ["DIT", "CHEOLMIN SHIN"],
      ["3rd AC", "MINHO LEE"],
      ["Gaffer", "HOONHO KWON"],
      ["1st", "BYUNGGOO KANG"],
      ["2nd", "JAEYOUNG HAN, JIN NAMGOONG"],
      ["3rd", "DONGJUN LEE, JINSEOK LEE, DONGHYUN KIM, SUNGHYUN JOO"],
      ["Jimmy Jib Operator", "YOUNGJUNG KIM"],
      ["1st", "HOJUN CHOI"],
      ["2nd", "EUNTAEK BAE"],
      ["3rd", "JIHOON KIM"],
      ["Art Director", "BORAM JUNG (RAMI)"],
      ["Art Assistant", "HYUNJOON SHIM, SUNGHEE JI"],
      ["Line Producer Team", "STEP BY STAFF"],
      ["Team Leader", "WONSUNG YOON"],
      ["PA Crew", "YOONSOO PARK, JUHWAN GO, TAEYOON KIM, SEONGJIN CHOI"],
      ["Location", "SOMEBOOKS"],
      ["Location Manager", "MINHO KIM (ZONESYSTEM)"],
      ["POST PRODUCTION DEPARTMENT"],
      ["Edited by", "RIMA YOON"],
      ["Post Assistant Director", "SEUNGMIN YIM, YEJIN AN, KYUNGHWAN JI"],
      ["Rigend VFX Team", "RIG.RIG.RIG (@ri9.ri9.ri9)"],
      ["Post-Production Supervisor", "RIMA YOON"],
      ["CG VFX", "YONGHWI JEONG, EUNYOUNG CHO, JIEUN BAEK, EONSOO HAN, MINYEONG KANG, MYEONGJIN BYEON"],
      ["Cleanup", "SUYEON PARK, YEJIN AN, KYUNGHWAN JI"],
      ["CG VFX", "HUSSAM EISSA"],
      ["Tracking", "AVINASH DEOGAM"],
      ["Compositor / Cleanup", "CHEN YI ZHI"],
      ["Rotoscope", "ARTVFXSTUDIO"],
      ["Rotoscope / Cleanup", "NGOC PHAM"],
      ["Colour", "RIMA YOON"],
      ["DANCER"],
      ["Super Super Kids Dancer", "YURICHIKA (@yurichika9)"],
      ["Super Kids Dancer", "AZHENG, BBOY NIUNIU, HONATSU, HYO BIN KIM, HYUK LEE, RIA, RICCA, RITTAGUNN, SONGHAOMING-SO, WANGXUANRAN, HYEYOON AN, SOYUN AN, GOWOORI CHOI, SOYUL HAM, CHAERIN HAN, SEOLHYUN JI, SUBIN JUNG, CHOYUN LEE, SONGHYEON LEE, SIHHYUN AN, SUIN CHO, DARAE CHOI, GAHYEON CHOI, CHAEHUI HAN, HANA JANG, EUNBYEOL JEONG, JUNGWON JOE, CHAEMYUNG JUNG, SUMIN JUNG, YUNSEO JUNG, SEEUN KIM, ARIN LEE, BOMI LEE, JAERIN LEE, RUHA LEE, HWAYOON LEE, YOONSEO SON, TAERI, TAEI YOON, ZOA"]
    ],
    note: ''
  },
  'sdf-bky-teaser': {
    title: '〈스트릿 월드 파이터 : 디렉터스 워〉 파이널 미션 치어 퍼포먼스 티저',
    artist: '백구영',
    category: 'M/V · Performance Teaser',
    cats: ['mv'], selected: true, preview: 'assets/street-world-fighter-bky-preview.mp4',
    youtube: 'IkycozfF8J8',
    client: '',
    role: 'DIRECTOR / EDIT',
    credits: [
      ["Directed by", "SEUNGMIN YIM x KOOYOUNG BACK"],
      ["Producer", "YUNJUNG KIM, JIYEON HONG"],
      ["1st AD", "MISEONG KIM"],
      ["2nd AD", "TYLER"],
      ["PA", "MINGYU PARK, YONGBAE KIM"],
      ["DOP", "GWANYEOL YOO"],
      ["1st AC", "HYUNJI KIM"],
      ["2nd AC", "YUNTAE GO"],
      ["3rd AC", "TAEMIN WOO"],
      ["Gaffer", "JAEYOUNG HAN"],
      ["Best Boy", "DOOHYUN HAN"],
      ["2nd", "JIN NAMGOONG"],
      ["3rd", "DONGYEON KIM, SUNGHYUN JOO"],
      ["Art Director", "MINGEE KIM"],
      ["Art Team", "NAYOUNG KIM, JISU CHOI, WOOHYEON LEE"],
      ["Set Builder", "DABIN CHEON, JONGWOOK PARK"],
      ["Edited by", "SEUNGMIN YIM"],
      ["DI", "MINJAE KIM (SQUARE COLOR)"],
      ["AI VFX", "HYEONSEONG LEE"],
      ["Sound Mixer", "JUNHYEONG JEON"]
    ],
    note: ''
  },
  'keyvitup-best-one': {
    title: 'KEYVITUP ‘BEST ONE’ Performance Video',
    artist: 'KEYVITUP (키빗업)',
    category: 'M/V · Performance Video',
    cats: ['mv'], selected: true, preview: 'assets/keyvitup-best-one-preview.mp4',
    youtube: 'FGZ21g7rsNc',
    client: '',
    role: 'PRODUCER / EDIT',
    credits: [
      ["KEYVITUP(키빗업) x SURGERY ‘BEST ONE’ Performance Video"],
      ["Visual Production", "BSCC PRODUCTION DESIGN CORP"],
      ["Written & Directed by", "KWON JIN MO"],
      ["Production Producer", "YIM SEUNG MIN"],
      ["Costume by", "KIM SEO JUN (SURGERY)"],
      ["Production Assistant", "KIM MI SEONG, SHIN SEUNG YONG"],
      ["Photographer", "SEOL GWANG HYEON"],
      ["Production Support", "JANG JUN HO"],
      ["DOP", "KIM DEOK JUNG"],
      ["Focus Puller", "SEO SEO HEE"],
      ["Robojib Operator", "KIM YONG HYUK"],
      ["Robojib Assistant", "JEON GI HUN"],
      ["Gaffer", "KIM YONG GU"],
      ["1st", "LEE DAE HAN"],
      ["2nd", "PARK YOUNG GYUN"],
      ["3rd", "LEE HYEON JUN, SIN DOO CHUL"],
      ["Showlight Department", "A&T LIGHT Company"],
      ["Head Operator", "MA SUNG KEUN"],
      ["Showlight Team", "LEE SEONG HAN"],
      ["Set", "ART CENTER"],
      ["Editor", "YIM SEUNG MIN"],
      ["DI", "SQUARE COLOR"],
      ["Colorist", "KIM MIN JAE"]
    ],
    note: ''
  },
  'hui-fan-concert-vcr': {
    title: 'HUI Fan Concert VCR',
    artist: 'HUI',
    category: 'M/V · Fan Concert VCR',
    cats: ['mv'], selected: true, poster: 'assets/hui-fan-concert-vcr.jpg?v=2', preview: 'assets/hui-fan-concert-vcr-preview.mp4',
    video: 'assets/hui-fan-concert-vcr-full.mp4',
    client: '',
    role: 'DIRECTOR / EDIT',
    credits: [
      ["WHO IS ME: SWITCH Opening VCR"],
      ["Artist", "HUI (PENTAGON)"],
      ["Director", "Yim Seungmin"],
      ["Production Producer", "Kim Miseong"],
      ["Production Assistant", "Kim Donggyu"],
      ["DOP", "Yoo Gwanyeol"],
      ["1st AC", "Shin Seungyong"],
      ["2nd AC", "Han Jiseong"],
      ["3rd AC", "Kim Jinhyeok, Lee Woohyeon"],
      ["DIT", "Han Jiseong"],
      ["Gaffer", "Kim Wansoo"],
      ["1st", "Choi Yejun"],
      ["Art Director", "Kim Mingee"],
      ["Art Team Designer", "Kim Mingee, Kim Nayoung, Choi Jisu"],
      ["Art Team", "Kim Nayoung, Choi Jisu, Gwon Iji"],
      ["Production Sound Mixer", "Choi Siyeong"],
      ["Boom Operator", "Park Jiseon"],
      ["Hair & Make-Up", "Kim Minju"],
      ["Edit", "Yim Seungmin"],
      ["DI Colorist", "Kim Minjae (SQUARE COLOR)"]
    ],
    note: ''
  },
  'limhyunsik-the-answer': {
    title: '‘나의 대답 (The Answer)’ MV',
    artist: '임현식 (LIMHYUNSIK)',
    category: 'M/V · Music Video',
    cats: ['mv'], selected: true, preview: 'assets/limhyunsik-the-answer-preview.mp4',
    youtube: 'Mk1ECAg_1yk',
    client: '',
    role: 'EDIT',
    credits: [],
    note: ''
  },
  'leejimin-youre-mine': {
    title: '넌 내꺼 넌 내 남자 (You’re Mine, You’re My Man) MV',
    artist: '이지민 (LEE JI MIN)',
    category: 'M/V · Music Video',
    cats: ['mv'], selected: true,
    youtube: 'J-mE0MhouOI',
    client: '',
    role: 'EDIT',
    credits: [],
    note: ''
  },
  'victor': {
    title: 'DANCE FILM ‘VICTOR’',
    artist: 'V19 FILM',
    category: 'M/V · Dance Film',
    cats: ['mv'], selected: true, preview: 'assets/victor-preview.mp4',
    youtube: 'gEcWhvyMhKI',
    client: '',
    role: 'DIRECTOR / EDIT',
    credits: [],
    note: ''
  },
  'borderless': {
    title: 'ART FILM ‘BORDERLESS’',
    artist: '',
    category: 'FILM',
    cats: ['film'], selected: true, poster: 'assets/borderless.jpg', preview: 'assets/borderless-preview.mp4',
    video: 'assets/borderless-full.mp4',
    client: '',
    role: 'DIRECTOR / EDIT',
    credits: [],
    note: ''
  },
  'keyvitup-inkigayo': {
    title: 'KEYVITUP | SBS 인기가요 260412 무대',
    artist: 'KEYVITUP (키빗업)',
    category: 'Art · Set Design',
    cats: ['art'], selected: true,
    youtube: 'NIL4fZ_6Rtg',
    client: '',
    role: 'SET DESIGN',
    credits: [],
    note: ''
  }
};
