export default function Text1() {
  return (
    <>
      <input
        type="text"
        className="mt-1 block rounded-full w-full px-3 py-2 border border-gray-300 rounded-md text-sm       shadow-sm placeholder-gray-400
        focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-800
        disabled:bg-gray-50 disabled:text-gray-500 disabled:border-gray-200 disabled:shadow-none
        invalid:border-pink-500 invalid:text-pink-600
        focus:invalid:border-pink-500 focus:invalid:ring-pink-500"
      />

      <input
        type="file"
        className="block w-full text-sm text-gray-500 rounded-full
        file:mr-4 file:py-2 file:px-4
        file:rounded-full file:border-0
        file:text-sm file:font-semibold
        file:bg-sky-50 file:text-sky-700  focus:ring-1
        hover:file:bg-sky-100 focus:outline-none focus:ring focus:ring-sky-300"
      />
      <button className="text-sm rounded-full py-2 px-4 bg-gray-200 shadow-lg hover:bg-sky-500 hover:text-white focus:outline-none  focus:ring   focus:ring-1   focus:ring-sky-300">
        Balass
      </button>

      <button className="bg-sky-600 text-gray-200 py-2 px-4 rounded-full hover:bg-sky-700 active:bg-sky-700 focus:outline-none focus:ring focus:ring-sky-400">
        Save changes
      </button>

      <p>
        通知倡导全区党政机关、事业单位和国有企业干部职工要率先垂范，一律在本地过年，一律不出境，不前往中高风险地区，尽量不离开当地，确有需要的要严格审批管理。全区各级干部职工和广大群众对计划从中高风险地区及境外来张返张的亲友，要劝导其暂时不来张返张，减少人员流动带来的疫情传播风险。
      </p>

      <p>
        发出倡议：广大企业要鼓励员工就地过年，各企业家要带头做好员工工作，发动员工就地过春节，形成“非必要不离广东”的共识。
      </p>

      <p>
        据微信公号“三乡发布”提供的消息，三乡镇新冠疫情防控指挥部介绍，近期国内多地发生局部聚集性疫情和散发病例，疫情防控形势十分严峻。为巩固该镇疫情防控成果，确保疫情不因春节人员流动聚集而扩散，保障企业员工的健康安全和企业生产的稳定有序，所以发出了这则倡议。
      </p>

      <p>
        记者查询发现，稍早前的12月5日，广西凭祥市新型冠状病毒感染的肺炎疫情防控工作领导小组指挥部办公室已在《关于实施凭祥市门店、商铺疫情防控
        “十个一律”的通知》当中提到，门店、商铺人员一律倡导就地过年、网络拜年。年关将至，各门店、商铺倡导店员就地过年、网络拜年，减少人员流动。
      </p>

      <p>
        这则通知面向全市各门店和商铺。市防疫指挥部提醒，门店、商铺若违反“十个一律”规定，首次发现违反规定的责令整改；第二次发现违反规定或拒不整改的，各行业主管部门按照相关法律法规规定，予以警告、罚款、责令停业整顿等处理。
      </p>

      <p className="text-base">
        You can also use variant modifiers to target media queries like
        responsive breakpoints, dark mode, prefers-reduced-motion, and more. For
        example, use md:text-base to apply the text-base utility at only medium
        screen sizes and above.
      </p>
      <p className="text-sm">
        By default, Tailwind provides 10 font-size utilities. You change, add,
        or remove these by editing the theme.fontSize section of your Tailwind
        config.
      </p>
      <p className="text-xs">
        If you need to use a one-off font-size value that doesn’t make sense to
        include in your theme, use square brackets to generate a property on the
        fly using any arbitrary value.
      </p>
      <p className="text-base">
        正常字体：邀请他不用花钱么？爱哪哪去。一个4、
        5十岁的老女人的价值观是很难改变的 想特朗普和拜登都是70多
        他们的世界观就更难改变了 所以不要尝试改变别人的想法 要改变的是自己
        要从实力的地位出发
      </p>
      <p className="text-sm">
        小号字体：台湾浅滩是澎湖群岛南部边缘由于大陆泥沙沉积和海洋洋流推高形成的浅滩性陆地。
        其范围相当于一个海南省这么大。北部于广东省地区相连。 南部和南海切割。
        东北链接闽台群岛的澎湖大岛，东沙就是其上的一个珊瑚群岛。
      </p>
      <p className="text-xs">
        特小号字体：这个浅滩平均深度不足40米。甚至有些地方只有是一个还在发育的标准陆地。
        最近该地区发生了地震。可见该地区随着板块挤压也会发生一些突发的板块运动。
        非常可能形成新岛屿或是珊瑚礁盘。国家应该考虑积极的关注这个区域。
        这个浅滩出现的任何新生岛礁对解决台湾问题都有很大帮助。
      </p>
    </>
  );
}
