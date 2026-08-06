type Props = { go: (href: string) => void }

const gallery = [
  { src: '/showroom/showroom1.jpg', alt: 'Classic vehicle inside the B & B Auto Exchange showroom' },
  { src: '/showroom/showroom2.jpg', alt: 'B & B Auto Exchange showroom detail' },
  { src: '/showroom/showroom3.jpg', alt: 'Classic car collection indoors' },
]

export default function ShowroomExperience({ go }: Props) {
  return <>
    <section className="showroom-story">
      <div className="wrap-wide showroom-story-grid">
        <div className="showroom-image-stack">
          <img className="showroom-warehouse" src="/showroom/classic_warehouse.jpg" alt="Classic vehicles in a warehouse" />
          <div className="showroom-caption"><span>B &amp; B AUTO EXCHANGE</span><strong>THE COLLECTION,<br />IN CONTEXT.</strong></div>
        </div>
        <div className="showroom-story-copy">
          <p className="garage-kicker">A better way to browse</p>
          <h2>MORE THAN<br /><em>A LISTING.</em></h2>
          <p>Every vehicle starts with the practical information buyers need: clear equipment, condition context, finance planning, transport options, and a direct way to ask questions.</p>
          <div className="showroom-story-points">
            <article><span>01</span><div><strong>Browse with intent</strong><p>Filter the live collection by make, price, and saved vehicles.</p></div></article>
            <article><span>02</span><div><strong>Plan the handoff</strong><p>Estimate payments, delivery, or a trade-in before you submit a request.</p></div></article>
            <article><span>03</span><div><strong>Keep the conversation simple</strong><p>Every request goes to the B & B team with the vehicle context attached.</p></div></article>
          </div>
          <button className="outline-link showroom-link" onClick={() => go('/inventory')}>Explore the collection <span>→</span></button>
        </div>
      </div>
    </section>

    <section className="showroom-tour wrap-wide">
      <div className="showroom-tour-heading"><div><p className="garage-kicker">Inside B &amp; B</p><h2>TAKE A LOOK<br /><em>AROUND.</em></h2></div><p>Classic-car buying starts with the atmosphere, then earns your confidence through the details.</p></div>
      <div className="showroom-tour-grid">{gallery.map((image, index) => <figure key={image.src}><img src={image.src} alt={image.alt} loading="lazy" /><figcaption><span>0{index + 1}</span>{index === 0 ? 'Cars with character' : index === 1 ? 'Details worth seeing' : 'A collection in motion'}</figcaption></figure>)}</div>
    </section>

    <section className="buyer-tools">
      <div className="wrap-wide buyer-tools-grid">
        <div className="buyer-tools-copy"><p className="garage-kicker">Your buying plan</p><h2>FROM FIRST LOOK<br /><em>TO FIRST DRIVE.</em></h2><p>Use the tools below before you reach out. They do not replace a final quote or approval, but they make the first conversation much more useful.</p></div>
        <div className="buyer-tools-cards">
          <button onClick={() => go('/financing')}><span>01</span><strong>Payment planner</strong><p>Set price, cash down, APR, and term to see an estimated monthly payment.</p><b>Plan financing →</b></button>
          <button onClick={() => go('/shipping')}><span>02</span><strong>Delivery estimator</strong><p>Choose your destination and transport level to receive a clear starting point.</p><b>Plan delivery →</b></button>
          <button onClick={() => go('/trade-in')}><span>03</span><strong>Trade-in request</strong><p>Tell us about your current car and keep your next purchase moving.</p><b>Value your vehicle →</b></button>
        </div>
      </div>
    </section>

    <section className="showroom-cta">
      <div className="wrap-wide showroom-cta-content"><p className="garage-kicker">Something specific in mind?</p><h2>THE NEXT GREAT<br /><em>DRIVE IS WAITING.</em></h2><p>Start in Inventory, save the vehicles you want to revisit, and request details when you are ready.</p><button className="amber-button" onClick={() => go('/inventory')}>View live inventory <span>→</span></button></div>
    </section>
  </>
}
