update public.anime
set title_kana = case title_ja
  when '新世紀エヴァンゲリオン' then 'しんせいきエヴァンゲリオン'
  when 'ポケットモンスター' then 'ぽけっともんすたー'
  when 'カウボーイビバップ' then 'かうぼーいびばっぷ'
  when 'Angel Beats!' then 'えんじぇるびーつ'
  when 'STEINS;GATE' then 'しゅたいんず・げーと'
  when 'あの日見た花の名前を僕達はまだ知らない。' then 'あのひみたはなのなまえをぼくたちはまだしらない'
  when 'Re:ゼロから始める異世界生活' then 'りぜろからはじめるいせかいせいかつ'
  else title_kana
end,
updated_at = now()
where is_published = true
  and title_kana is null
  and title_ja in (
    '新世紀エヴァンゲリオン',
    'ポケットモンスター',
    'カウボーイビバップ',
    'Angel Beats!',
    'STEINS;GATE',
    'あの日見た花の名前を僕達はまだ知らない。',
    'Re:ゼロから始める異世界生活'
  );