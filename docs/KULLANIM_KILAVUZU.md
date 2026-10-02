# NetworkOS – Detaylı Kullanım Kılavuzu (v1.2.1)

## 1. NetworkOS nedir?

NetworkOS, kişilerinizi ve ilişkilerinizi hatırlamanıza yardımcı olan özel bir uygulamadır. Hesap açmazsınız, sunucuya bağlanmazsınız; tüm verileriniz şifreli olarak **yalnızca telefonunuzda** saklanır.

- **Hesap yok. Sunucu yok. Takip yok.**
- İngilizce + Türkçe tam destek (telefon dilinize göre açılır, sonradan değiştirilebilir).
- Açık, koyu ve sistem teması.

## 2. İlk açılış

1. Uygulamayı açın.
2. Adınızı ve soyadınızı yazın (yalnızca cihazınızda saklanır).
3. **"Ağınızı oluşturmaya başlayın"** düğmesine dokunun.

Hepsi bu. Giriş ekranı, şifre veya e-posta yoktur. Bu ekranı yalnızca bir kez görürsünüz.

## 3. Ekranlara genel bakış

Alttaki sekme çubuğunda 5 bölüm vardır:

| Sekme | Ne işe yarar |
|---|---|
| **Ana Sayfa** | Bugün yapılacak iş: zamanı gelen takipler, doğum günleri, bekleyen sözler |
| **Kişiler** | Tüm kişiler, arama, etikete göre filtreleme |
| **Ağ** | İlişkilerin görsel grafiği, en kısa bağlantı yolu, ağ içgörüleri |
| **Takip** | Gecikmiş / bugün / bu hafta / sonra kovalarında takipler |
| **Daha Fazla** | Tüm ek özellikler, güvenlik, yedekleme, eşitleme, dil, tema |

## 4. Ana Sayfa

Ana Sayfa bir gösterge paneli değil, **günün işidir**. Yapılacaklar en üstte durur ve her satır yerinde iş görür — başka bir ekrana gitmeniz gerekmez.

Ekranın başlığı **"Bağlantıyı koru."**, sağ üstteki turuncu **+** düğmesi doğrudan kişi ekleme formunu açar.

### 4.1. Bugün

Gecikmiş ve bugüne tarihlenmiş takipler birlikte listelenir. En fazla 3 satır gösterilir; daha fazlası varsa başlığın yanında **Tümünü gör** çıkar ve sizi **Takip** sekmesine götürür.

Her satırın altında takibin ne zamana ait olduğu (**Takip · …**) ve iki düğme vardır:

- **Bir hafta ertele** — takibi bir hafta ileri atar.
- **İletişim kuruldu** — son temas tarihini bugüne çeker; kişide ritim tanımlıysa bir sonraki takip kendiliğinden planlanır.

İkisi de listeyi anında tazeler; ekran değiştirmeniz gerekmez.

### 4.2. Doğum günleri ve sözler

- Önümüzdeki **7 gün** içindeki doğum günleri (en fazla 3) hediye simgesiyle listelenir; dokunduğunuzda kişi profiline gider.
- Vadesi gelmiş sözünüz varsa **"Zamanı gelen N söz"** satırı görünür ve **Sözler ve takipler** ekranını açar.

### 4.3. Sakin gün ve boş ağ

- Takip, doğum günü ve söz yoksa: *"Sakin bir gün. Sonraki takibiniz burada görünecek."*
- Hiç kişiniz yoksa **"Henüz kimse yok"** kartı çıkar; **Rehberden aktar** ve **Birini ekle** düğmeleriyle başlarsınız.
- Veriler okunamazsa ekran bunu açıkça söyler ve bir **tekrar dene** düğmesi verir — boş ekranla hatayı karıştırmazsınız.

### 4.4. Son eklenenler ve sayaçlar

Alt kısımda en son eklediğiniz kişiler, en altta ise iki sayaç vardır: **Kişiler** (toplam) ve **Güçlü** (güçlü bağlantı sayısı). Sayaçlar dokunulabilir — sırasıyla Kişiler ve Ağ sekmesini açar.

## 5. Kişiler

### 5.1. Yeni kişi ekleme

**+** düğmesine dokunun ve formu doldurun. Tüm alanlar isteğe bağlıdır, yalnızca **Ad** zorunludur:

- **Fotoğraf:** galeriden seçin veya çekin. Küçültülmüş bir kopya şifreli veritabanında saklanır; yedek ve eşitlemeyle birlikte taşınır.
- **Temel bilgiler:** ad, soyad, unvan, şirket
- **Nasıl ulaşılır:** e-posta, telefon, LinkedIn adresi, şehir, ülke
- **Bağlam:** doğum günü, nasıl tanıştık, tanışma yeri, tanışma tarihi, notlar
- **Yakınlık:** ilişki gücü (1–5), önem (1–5), favori, ritim, **gizli**

Tarih alanlarına **YYYY-AA-GG** (`1990-03-17`) veya **GG.AA.YYYY** (`17.03.1990`) yazabilirsiniz; `bugün`, `yarın`, `dün` kelimeleri de anlaşılır. Hatalı tarih girerseniz uygulama uyarır ve kaydetmez.

Form birçok alanı sizin yerinize doldurur — hepsi öneridir, dokunduğunuz alana bir daha karışılmaz:

- **Panodan doldur** (yeni kişide en üstte): bir imza bloğunu veya kartvizit metnini kopyalayıp bu düğmeye dokunun; ad, e-posta, telefon, LinkedIn, unvan ve şirket boş alanlara yerleşir.
- **E-posta** yazınca ad-soyad boşsa e-postadan tahmin edilir (`ali.yilmaz@…` → Ali Yılmaz) ve web sitesi o domainde olan şirket otomatik seçilir. Alan adı kayıtlı değilse **"… şirketini oluştur"** çipi tek dokunuşla şirketi kurar.
- **Telefon** yazınca ülke (`+90…` → Türkiye), sabit hat ise şehir (`0212…` → İstanbul) boş alanlara gelir.
- **LinkedIn** adresindeki `ad-soyad` kısmı boş adı doldurur.
- **Şirket** seçince boş şehir/ülke şirketten gelir; **tanışma tarihi** yeni kişide bugünden başlar.
- Aynı e-posta/telefonla kaydetmeye kalkarsanız uygulama mevcut kişiyi açmayı teklif eder; notların içinde kalmış e-posta/telefon/LinkedIn kaydedilirken boş alanlara taşınır.
- **Ritim** (30/90/180 gün) seçtiğiniz yeni kişiye ilk takip bugünden başlayarak otomatik kurulur.

### 5.2. Kişiyi düzenleme ve silme

Kişi profilinin sağ üstünde iki düğme vardır:

- **Kalem** — aynı formu açar, tüm alanları değiştirebilirsiniz.
- **Çöp kutusu** — kişiyi çöp kutusuna taşır. **Daha Fazla → Çöp kutusu**'ndan geri yükleyebilirsiniz; kalıcı silme oradaki ayrı bir işlemdir.

### 5.3. Rehberden aktarma

**Daha Fazla → Rehberden aktar** yolunu izleyin. İzin verdiğinizde kişiler listelenir; aktarmak istediklerinizi seçip **Seçilenleri aktar** düğmesine dokunun.

Listenin üstünde **"Rehberinizde N yeni kişi"** yazar: daha önce aktarmadığınız kaç kişi olduğunu gösterir. Zaten ağınızda olanlar **"Zaten ağınızda"** etiketiyle işaretlenir.

Aktarım sırasında ad, unvan, şirket, e-posta, telefon, şehir, ülke, **doğum günü** ve **LinkedIn adresi** ayrı alanlara yerleştirilir. Kalan bilgiler (ikinci telefon, takma ad, akrabalık) notlara okunabilir satırlar olarak eklenir. Aynı telefon veya e-postaya sahip kişiler atlanır.

Aktardığınız kişilerin rehberdeki değişikliklerle güncel kalmasını istiyorsanız **Rehber senkronu**'nu açın (bkz. §8.15).

### 5.4. Kişi profili

Bir kişinin sayfasında şunlar bulunur:

- İlişki durumu (Sağlıklı / Soğuyor / Uykuda), güç ve önem
- **Ara / E-posta / LinkedIn** kısayolları
- **Takip** bölümü: yarın, bir hafta, bir ay, 3 ay veya takibi kaldır
- **Ritim** bölümü: 30 / 90 / 180 günde bir
- **Doğum günü** kartı: kaç gün kaldığı ve kaç yaşına girdiği
- **Sözler**: size borçlu olunanlar ve sizin borçlu olduklarınız
- **Bağlantılar**: bu kişinin ağdaki diğer bağlantıları. Bağlantı eklerken aynı şirketteyseniz tür "iş arkadaşı", aynı soyadı taşıyorsanız "aile" önerilir.
- **Bağlam** ve **Zaman çizelgesi**

### 5.5. Arama ve filtreleme

Kişiler sekmesindeki arama kutusu ad, soyad, e-posta, telefon, unvan, şehir, notlar ve şirket içinde arar. Türkçe karakterler normalleştirilir: `sükrü` yazarak `Şükrü` bulunur.

Arama kutusunun altındaki etiket şeritinden bir etikete dokunarak listeyi daraltabilirsiniz.

### 5.6. Etkileşim kaydetme

Kişi profilindeki **Zaman çizelgesi** başlığının yanındaki **+** düğmesi etkileşim formunu açar:

- Tür çipleri (görüşme, telefon, kahve…) ve tarih bugünden başlar; **Dün / Bugün** çipleri tek dokunuşla değiştirir.
- Açıklamaya "dün konuştuk" yazarsanız tarih düne çekilir (geleceğe dair kelimeler görmezden gelinir, çünkü bu alan geçmişi kaydeder).
- Kaydettiğinizde kişide ritim tanımlıysa bir sonraki takip kendiliğinden planlanır.

## 6. Ağ (ilişki grafiği)

- Ekran ilk açıldığında grafiğin merkezinde **siz** varsınız; çevresinde tanıdığınız kişiler durur.
- Bir kişiye dokunduğunuzda odak o kişiye geçer ve onun çevresi gösterilir.
- Sağ üstteki hedef simgesi sizi tekrar merkeze alır.
- İki parmakla yakınlaştırın, sürükleyerek gezinin.

### 6.1. En kısa yol bulma

1. Bir kişiyi seçin.
2. **Yol bul** düğmesine dokunun.
3. Ulaşmak istediğiniz kişiyi seçin.

Uygulama altı dereceye kadar en kısa yolu bulur ve zinciri gösterir.

### 6.2. Geri sarma

Grafiğin altındaki **Geri sar** şeridinden 3 ay, 1 yıl veya 3 yıl öncesini seçin. Ağınızın o tarihteki hâli gösterilir: ne büyüdü, ne karardı. Ek bir kayıt tutulmaz — her satırdaki oluşturulma tarihi zaten vardı.

### 6.3. Ağ içgörüleri

Sağ üstteki kıvılcım simgesi **Ağ içgörüleri** ekranını açar (aynı ekrana **Daha Fazla → Ağ içgörüleri**'nden de girebilirsiniz). Grafiğin şeklinden çıkarılan dört şey söylenir:

- **Kaybetmeyi göze alamayacağınız kişiler** — bir kişi belirli insanlara ulaşmanızın tek yolu ise uyarır.
- **Hiç buluşmayan kümeler** — birbirinden kopuk iki grup varsa, bir tanıştırmanın onları birleştireceğini söyler.
- **Yoğunlaşma riski** — ağınızın büyük bölümü tek şirkette toplanmışsa bunu gösterir.
- **Sessizleşiyor** — 90 günden uzun süredir temas kurmadığınız güçlü ilişkileri sayar.

Her içgörünün altındaki **Kimler** düğmesi iddianın arkasındaki kişileri açar — bir sayı, üzerine dokunulabilir olmadığı sürece güvenilmez.

Aynı ekranda **yapmaya değer tanıştırmalar** listelenir: birbirini tanımayan ama ortak bir bağlantısı, şirketi, etiketi veya şehri olan kişi çiftleri. **Tanıştırma yaz** düğmesi hazır mesajı paylaşım menüsüne verir; **Şimdi değil** o çifti listeden kaldırır.

## 7. Takip

Takipler dört kovaya ayrılır: **Gecikmiş**, **Bugün**, **Bu hafta**, **Sonra**. Her kovanın yanında kaç kişi olduğu yazar.

Her satırda iki kısayol vardır:

- **Bir hafta ertele** — takibi mevcut tarihinden bir hafta ileri atar.
- **İletişim kuruldu** — son temas tarihini bugüne çeker. Kişide ritim tanımlıysa bir sonraki takip otomatik olarak planlanır.

Takip tarihi verdiğinizde, bildirim izniniz varsa o gün için telefon bildirimi kurulur.

## 8. Daha Fazla menüsü

Bu bölüm menüdeki sırayı izler.

### 8.1. Dil ve tema

Listeden önce, ekranın üstünde iki grup düğme vardır:

- **Dil:** English / Türkçe. Varsayılan telefon ayarınızdan gelir.
- **Görünüm:** Sistem / Açık / Koyu.

### 8.2. Bugünün odağı

Günün tek bakışta özeti:

- **Bekleyen sözler** — vadesi gelen sözler (↑ sizin borcunuz, ↓ size verilen)
- **Doğum günleri** — önümüzdeki 30 gün
- **İlişki nabzı** — puanı düşen, ilgi bekleyen kişiler
- **Hatırlıyor musunuz?** — uzun süredir görüşmediğiniz birinin fotoğrafı; adı gizli. Önce yüzü hatırlamayı deneyin, sonra **Göster**'e dokunun.

### 8.3. Ağ içgörüleri

Ağ sekmesindeki kıvılcım simgesiyle aynı ekran. Ayrıntılar için §6.3'e bakın.

### 8.4. Görüşmeye hazırlan

İki yarısı vardır.

**Takvim yarısı** — takvim izni verdiğinizde uygulama önümüzdeki 7 günün etkinliklerini okur ve katılımcı e-postalarını/adlarını kişilerinizle eşleştirir. Yalnızca ağınızdan biri olan görüşmeler listelenir.

**Brifingler** anahtarını açarsanız, böyle bir görüşmeden 30 dakika önce telefon bildirimi alırsınız. Takvim yalnızca okunur; hiçbir şey telefondan çıkmaz ve takviminize hiçbir şey yazılmaz.

**Hazırlık yarısı** — bir kişi seçtiğinizde bağlamı, o kişiye verdiğiniz açık sözler, son etkileşimleri ve önerilen sorular gösterilir. Görüşmeden sonra notlarınızı yapıştırıp **Yerel özet oluştur** düğmesine dokunun; uygulama cümleleri ayırır, söz gibi görünenleri işaretler ve etkileşim olarak kaydetmenizi sağlar. Bu işlem tamamen cihaz içinde, basit metin analiziyle yapılır.

### 8.5. Tanıştırma motoru

İki kişi seçip **Bağlantıyı bul** düğmesine dokunun; uygulama aradaki en kısa yolu bulur ve hazır bir tanıştırma mesajı yazar. Otomatik öneriler için **Ağ içgörüleri** ekranını kullanın.

### 8.6. Etkinlik modu

1. **Etkinlik adı**, tarih (YYYY-AA-GG veya GG.AA.YYYY; `yarın` da olur) ve konum girin.
2. **Etkinlik oluştur** düğmesine dokunun.
3. Açılan etkinlik sayfasında katılımcıları işaretleyin. Listede olmayan biri varsa **Bu etkinlikten yeni kişi ekle** düğmesi formu nerede/ne zaman tanışıldığı doldurulmuş açar; kaydedince kişi otomatik katılımcı olur.
4. **Buradaki herkesi bağla** düğmesi, işaretlediğiniz her kişi arasında "etkinlikte tanıştık" bağlantısı kurar.

Böylece bir konferans, ağ grafiğinizde gerçek bir kümeye dönüşür.

### 8.7. Sözler ve takipler

Verdiğiniz ve size verilen sözleri takip edin:

1. **Ben borçluyum** veya **Bana söz verildi** seçin.
2. Kişiyi seçin, sözü yazın, isterseniz son tarih verin. "Yarın gönder", "haftaya ara", "cuma konuşalım" gibi cümlelerde tarih kendiliğinden dolar; **Bugün / Yarın / Gelecek hafta** çipleri de tek dokunuşla seçilir.
3. **Sözü kaydet** düğmesine dokunun.

Ekranın üstündeki **Karşılıklılık** kartı dengeyi gösterir: kaç söz borcunuz var, kaç söz size verilmiş. Aynı denge her kişinin profilinde de görünür.

### 8.8. Ağ hedefleri

"Bu çeyrek 5 yatırımcıyla konuş" gibi bir hedef koyun. İlerleme elle girilmez — seçtiğiniz süre içinde kaydettiğiniz etkileşimlerden sayılır, isterseniz bir etiketle sınırlanır. Çubuğun altındaki **Kimler sayıldı** düğmesi sayının arkasındaki kişileri gösterir.

### 8.9. Şirketler

- Kişileri çalıştıkları şirketlere bağlayın.
- **Şirket profili** sayfasında o şirketteki tüm kişileri bir arada görün.
- Şirketi düzenleyebilir veya silebilirsiniz; şirket silindiğinde kişiler kalır, yalnızca bağ kopar.

### 8.10. Etiketler

- Etiket oluşturun (örn. "üniversite", "müşteri", "aile"). Her etiketin yanında kaç kişide kullanıldığı yazar.
- Kişi profilindeki **Etiketleri yönet** ekranından atayın veya kaldırın; aynı ekrandan yeni etiket de oluşturabilirsiniz.
- Kişiler sekmesindeki etiket şeritinden listeyi filtreleyin.
- Bir etiketi silmek onu tüm kişilerden kaldırır; kişiler kalır.

### 8.11. Kopyaları birleştir

Aynı telefon, e-posta veya adı paylaşan kişiler gruplanır. Korumak istediğinize dokunun; notlar, etkileşimler, sözler, etiketler ve bağlantılar ona taşınır, diğerleri çöp kutusuna gider. Koruduğunuz kaydın dolu alanları asla ezilmez; yalnızca boşları doldurulur.

### 8.12. Gizli kasa

Bir kişiyi düzenlerken **Gizli** etiketini seçin. O kişi listelerden, aramadan, grafikten, içgörülerden, hatırlatmalardan, CSV'den ve paylaşımlardan kaybolur.

**Daha Fazla → Gizli kasa** ekranından Face ID ile açarsınız. Uygulama arka plana geçtiği anda kasa yeniden kilitlenir.

Şifreli yedek ve eşitleme paketi gizli kişileri **taşır** (onlar da sizin verileriniz). Şifresiz CSV ve kişi paylaşımı kasa açık olsa bile **asla** taşımaz. Rehber senkronu da gizli kişilere hiç dokunmaz.

### 8.13. Çöp kutusu

Silinen kişiler burada durur. **Geri yükle** kişiyi notları ve geçmişiyle birlikte geri getirir. **Kalıcı olarak sil** cihazdan gerçekten kaldıran tek işlemdir; geri alınamaz ve eşitlemeyle geri gelmez.

### 8.14. Profil

Kendi profilinizi düzenleyin: ad, soyadı, unvan, şirket, e-posta, telefon. Bu bilgiler ağ grafiğinin merkezindeki "siz" düğümünü adlandırır.

### 8.15. Rehber senkronu

Aktardığınız kişileri, telefon rehberinizdeki değişikliklerle güncel tutar. **Tek yönlü ve sessizdir: rehberiniz yalnızca okunur, asla yazılmaz.**

**Varsayılan olarak kapalıdır.** Açmak için **Aktardığınız kişileri güncel tut** anahtarını kullanın — rehber izni yalnızca bu anahtara dokunduğunuzda istenir, başka hiçbir yerde arka planda sorulmaz.

Açıkken ne yapar:

- Yalnızca **boş bıraktığınız alanları** doldurur: e-posta, telefon, şehir, ülke, unvan, LinkedIn/web adresi, doğum günü, fotoğraf.
- **Yazdıklarınızın üzerine asla yazmaz.** Uygulamada girdiğiniz bir değer her zaman kazanır.
- Ad, notlar ve ilişki sinyalleri (güç, önem, ritim, etiketler) hiç değiştirilmez.
- **Yeni kişileri kendiliğinden eklemez.** Rehberinizdeki yeni kişiler, siz seçene kadar **Rehberden aktar** ekranında bekler.
- **Gizli** işaretli kişilere dokunmaz — kasa o sırada açık olsa bile.
- Bir doğum günü doldurulduğunda hatırlatmalar buna göre yeniden planlanır.

Ne zaman çalışır: uygulamayı açtığınızda ve öne getirdiğinizde, ayrıca rehberinizde bir değişiklik olduğunda. Arka arkaya çalışmaması için **15 dakikalık** bir bekleme vardır.

Ekrandaki kart son durumu gösterir: **Son kontrol …** ve **N kişi güncellendi** (ya da *"Son seferde doldurulacak bir şey yoktu"*).

iOS'ta rehberinizin yalnızca bir bölümünü paylaştıysanız uygulama bunu söyler; **Kişileri seç…** düğmesiyle paylaştığınız listeyi genişletebilirsiniz.

### 8.16. Güvenli paylaşım

Kişileri başkasıyla paylaşırken:

1. Paylaşılacak kişileri işaretleyin.
2. **Şifreli dosyayı paylaş** düğmesine dokunun.
3. Uygulama size **tek kullanımlık bir kod** verir. Dosyayı istediğiniz uygulamayla gönderin, **kodu ayrı bir kanaldan** iletin (örn. dosya e-posta ile, kod telefonla).

Alıcı aynı ekranın alt kısmındaki **Kişileri al** bölümünden dosyayı seçer ve kodu girer.

Kod olmadan dosya açılmaz — sizin tarafınızdan bile.

### 8.17. Cihazlar arası eşitleme

iPhone ve iPad'inizi (veya eski ve yeni telefonunuzu) sunucusuz eşitleyin:

1. Birinci cihazda **Eşitleme paketi dışa aktar** düğmesine dokunun.
2. Dosyayı AirDrop veya Dosyalar ile ikinci cihaza gönderin.
3. İkinci cihazda **Eşitleme paketi içe aktar** düğmesine dokunun ve dosyayı seçin.

Her iki cihazın **aynı kurtarma anahtarını** kullanması gerekir; ikinci cihazda anahtarı geri yükleme alanına bir kez girmeniz yeterlidir.

Birleştirme her kaydın en yeni sürümünü tutar, iki yönde de çalışır ve aynı dosyayı iki kez içe aktarmak hiçbir şeyi bozmaz. Silmeler de aktarılır. Bulut, hesap veya sunucu yoktur.

### 8.18. Yedekleme ve geri yükleme

**Kurtarma anahtarı.** Ekranın üstünde 32 karakterlik bir kurtarma anahtarı vardır. Yedekleriniz telefonla değil **bu anahtarla** şifrelenir.

> **Bunu bir yere yazın.** Anahtar olmadan yedeğiniz yeni bir cihazda açılamaz ve kimse sizin için kurtaramaz.

Üç işlem vardır:

- **Şifreli yedek dışa aktar:** Tüm ağınız `.networkos` dosyasına yazılır. Kurtarma anahtarınız olan herkes, hangi cihazda olursa olsun bu dosyayı açabilir.
- **Kişileri CSV olarak dışa aktar:** Düz metin tablo. **Dikkat:** CSV şifreli değildir; dosyaya sahip herkes okuyabilir. Uygulama önce uyarır.
- **Şifreli yedeği geri yükle:** Dosyayı seçin. Bu cihazın anahtarı farklıysa, yedeği alan cihazın kurtarma anahtarını alandaki kutuya yazın. Kayıtlar birleştirilir; her kaydın **yeni olan sürümü** korunur ve hiçbir şey silinmez.

Telefon değiştirirken: eski telefonda kurtarma anahtarını not edin → şifreli yedek alın → dosyayı yeni telefona aktarın → yeni telefonda anahtarı girip geri yükleyin.

### 8.19. Güvenlik ve uygulama kilidi

1. **Biyometrik kilidi aç** düğmesine dokunun (Face ID / Touch ID).
2. **Tekrar kilitleme süresi** seçin: hemen, 1 dakika veya 5 dakika. Uygulama arka plana her geçtiğinde bu süre sonunda yeniden kilitlenir.
3. **Uygulama değiştiricide içeriği gizle** açıkken, uygulama arka plana geçtiğinde ekran örtülür; görev değiştiricide kişileriniz görünmez.

Kilidin ne zaman isteneceğini yalnızca bu süre belirler: uygulamayı sıfırdan açmanız tek başına oturumunuzu sıfırlamaz, ve Face ID istemi Türkçe görünür.

Aynı ekranda **haftalık özet** anahtarı vardır. Açıkken kişi başına bildirim yerine haftada bir kez, pazar akşamı tek bir sakin özet alırsınız.

Simülatörde biyometri çalışmazsa bu normaldir; gerçek cihazda deneyin.

### 8.20. NetworkOS hakkında

Kurulu sürümü ve iki güvenlik ayarının gerçekten açık olup olmadığını gösterir:

- **NetworkOS** — sürüm numarası (bu kılavuz 1.2.1'i anlatır).
- **SQLCipher** — `on` ise veritabanınız şifrelidir.
- **FTS5** — `on` ise tam metin araması etkindir.

Bu satırlar varsayılmaz, kurulu uygulamadan okunur; `off` görürseniz o özellik bu yapıda gerçekten kapalıdır.

## 9. Gizlilik ve güvenlik özeti

- Tüm veriler cihazınızdaki **SQLCipher ile şifreli** SQLite veritabanındadır. Anahtar telefonun güvenli kasasındadır. Fotoğraflar da veritabanının içindedir, dosya sisteminde açıkta durmaz.
- Şifreleme öncesinde oluşturulmuş bir veritabanı varsa, güncellemede yerinde şifreliye taşınır; taşıma yarıda kalırsa bir sonraki açılışta kaldığı yerden toparlanır, veriniz ortada kalmaz.
- Cihazdan çıkan her dosya (yedek, paylaşım, eşitleme paketi) şifrelidir ve yalnızca sizin elinizdeki bir sırla açılır.
- Rehber, takvim ve bildirim izinleri yalnızca ilgili ekranda, siz dokunduğunuzda istenir. Rehber izni yalnızca **Rehberden aktar** ekranında ve **Rehber senkronu** anahtarında sorulur.
- Rehber senkronu tek yönlüdür: telefon rehberiniz okunur, **asla yazılmaz**.
- Takvim yalnızca okunur; takviminize hiçbir şey yazılmaz.
- Face ID verisi cihazdan asla çıkmaz.
- Bildirimler cihaz içinde planlanır; bildirim sunucusu kullanılmaz.
- Reklam, takip ve üçüncü parti analiz araçları yoktur.
- Uygulamayı silmek tüm verileri siler; bizde kopya bulunmaz.

**Daha Fazla → NetworkOS hakkında** ekranı, kurulu sürümde şifrelemenin ve tam metin aramanın gerçekten açık olup olmadığını gösterir.

Ayrıntılı metin: [Gizlilik Politikası](https://ermixserdar.github.io/networkos/privacy) · Yardım: [Destek](https://ermixserdar.github.io/networkos/support) · E-posta: support@networkos.app

## 10. Sık sorulan sorular

**Hesap açmam gerekiyor mu?**
Hayır. Sunucu yok, hesap yok.

**Verilerim nerede?**
Telefonunuzda, SQLCipher ile şifreli veritabanında. Anahtar güvenli kasada (Keychain).

**Kurtarma anahtarımı kaybedersem ne olur?**
Eski yedekleriniz açılamaz. Kimse kurtaramaz — sunucuda kopyası yoktur. Bu yüzden anahtarı bir yere yazın.

**Telefonum kayboldu, yedeğim var. Ne yapmalıyım?**
Yeni telefonda uygulamayı açın, **Yedekleme** ekranına girin, kurtarma anahtarınızı geri yükleme alanına yazın ve yedek dosyasını seçin.

**Paylaştığım dosyayı karşı taraf açamıyor.**
Tek kullanımlık kodu ilettiğinizden emin olun. Kod olmadan dosya açılmaz.

**Rehber iznini reddettim, ne yapmalıyım?**
Ayarlar → NetworkOS → Kişiler bölümünden izni açabilir veya kişileri el ile ekleyebilirsiniz.

**Rehberdeki bir kişinin numarasını değiştirdim; uygulama neden güncellemedi?**
**Rehber senkronu** kapalı olabilir (varsayılan kapalıdır) — **Daha Fazla → Rehber senkronu**'ndan açın. Açıksa: o alan uygulamada zaten doluysa üzerine yazılmaz; senkron yalnızca boş alanları doldurur. Ayrıca art arda çalışmamak için 15 dakikalık bir bekleme vardır.

**Rehberime yeni eklediğim kişi uygulamada görünmüyor.**
Doğrusu bu. Rehber senkronu kimseyi kendiliğinden eklemez; yeni kişiler **Rehberden aktar** ekranında, üstteki "Rehberinizde N yeni kişi" satırının altında sizi bekler.

**NetworkOS rehberimi değiştirir mi?**
Hayır. Rehber yalnızca okunur; uygulama telefon rehberinize hiçbir şey yazmaz veya silmez.

**iOS neden hatırlatıcı izni istiyor? Uygulama hatırlatıcı kullanmıyor ki.**
Kullanmıyor. iOS'ta takvim erişimi ile hatırlatıcılar aynı sistem izin grubunda olduğu için istem böyle görünür. NetworkOS hatırlatıcı oluşturmaz veya okumaz.

**Biyometrik kilit simülatörde çalışmıyor.**
Normaldir. Gerçek cihazda deneyin veya kilidi kapalı bırakın.

**Her şeyi nasıl silerim?**
Uygulamayı silin. Bulut kopyası olmadığı için her şey gider.

**Gizli işaretlediğim kişiyi bulamıyorum.**
Doğrusu bu. **Daha Fazla → Gizli kasa**'dan kasayı açın; uygulama arka plana geçene kadar görünür olur.

**Yanlışlıkla birini sildim.**
**Daha Fazla → Çöp kutusu → Geri yükle**. Kalıcı silme ayrı ve açıkça uyaran bir işlemdir.

**Ağ grafiği boş görünüyor.**
Merkezde siz varsınız; çevresinde en az bir kişi olması gerekir. Kişiler arası çizgiler için de en az iki kişi arasında ilişki tanımlamalısınız.

**Ana Sayfa'daki sayaçlar nereye gitti?**
Sayaçlar duruyor, yalnızca aşağı indi. Ana Sayfa artık günün işiyle başlıyor; **Kişiler** ve **Güçlü** sayaçları ekranın en altında ve dokunulabilir.

**CSV ile şifreli yedek arasındaki fark nedir?**
Şifreli yedek yalnızca kurtarma anahtarıyla açılır. CSV düz metindir; herkese göndermeyin.

## 11. Günlük kullanım önerisi

1. Sabah **Ana Sayfa**'yı açın; "Bugün" bölümünü yerinde boşaltın — her satırda **İletişim kuruldu** veya **Bir hafta ertele**.
2. Daha geniş bir resim için **Bugünün odağı** ekranına bakın (1 dakika).
3. Önemli kişilere bir **ritim** verin (30/90/180 gün); sonraki takipler kendiliğinden planlansın.
4. Yeni tanıştığınız kişiyi aynı gün ekleyin; ilk izlenim notunu yazın.
5. Rehberinizi zaten güncel tutuyorsanız **Rehber senkronu**'nu bir kez açın; boş alanlar kendiliğinden dolsun.
6. Haftada bir **Ağ içgörüleri** ekranına göz atın; köprü kişileri ve yapmaya değer tanıştırmaları görün.
7. Ayda bir **Kopyaları birleştir** ekranına bakın; aktarım ve eşitleme kopya biriktirir.
8. Ayda bir **şifreli yedek** alın; kurtarma anahtarınızın hâlâ yazılı olduğundan emin olun.
