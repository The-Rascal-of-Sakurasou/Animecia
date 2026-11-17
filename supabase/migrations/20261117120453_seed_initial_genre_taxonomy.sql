-- Initial editorial genre taxonomy for ANIXIA.
-- Genres describe primary narrative categories; settings and motifs belong in tags.

INSERT INTO public.genres (name, name_ja, description)
VALUES
  ('Action', 'アクション', '動きのある展開や対決を中心に描く作品'),
  ('Adventure', 'アドベンチャー', '旅・探索・未知の場所への挑戦を中心に描く作品'),
  ('Comedy', 'コメディ', '笑いやユーモアを中心に描く作品'),
  ('Drama', 'ドラマ', '人間関係や葛藤、社会的な出来事を中心に描く作品'),
  ('Fantasy', 'ファンタジー', '魔法や架空世界など、現実とは異なる設定を中心に描く作品'),
  ('Science Fiction', 'SF', '科学技術・未来・宇宙などを扱う作品'),
  ('Romance', '恋愛', '恋愛関係や感情の変化を中心に描く作品'),
  ('Slice of Life', '日常', '日常生活や身近な出来事を中心に描く作品'),
  ('Mystery', 'ミステリー', '謎や真相の解明を中心に描く作品'),
  ('Suspense', 'サスペンス', '緊張感や危機、先の読めない展開を中心に描く作品'),
  ('Horror', 'ホラー', '恐怖や不安を主題とする作品'),
  ('Sports', 'スポーツ', 'スポーツや競技を中心に描く作品'),
  ('Music', '音楽', '音楽・演奏・歌唱を中心に描く作品'),
  ('Historical', '歴史', '過去の時代や歴史的背景を扱う作品'),
  ('War', '戦争', '戦争や紛争が物語の中心となる作品'),
  ('Mecha', 'ロボット', 'ロボットや搭乗型メカを中心に描く作品'),
  ('Psychological', '心理', '心理や内面的な葛藤を中心に描く作品'),
  ('Supernatural', '超自然', '超常現象や人知を超えた存在を扱う作品')
ON CONFLICT (name) DO UPDATE SET
  name_ja = EXCLUDED.name_ja,
  description = EXCLUDED.description;
