import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-flipkart-dark text-white mt-auto">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-flipkart-yellow font-semibold mb-4 uppercase text-sm tracking-wider">
              About
            </h3>
            <ul className="space-y-2 text-sm text-gray-300">
              <li><Link href="/about" className="hover:text-white">About Us</Link></li>
              <li><Link href="/contact" className="hover:text-white">Contact Us</Link></li>
              <li><Link href="/admin" className="hover:text-white">Admin Portal</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-flipkart-yellow font-semibold mb-4 uppercase text-sm tracking-wider">
              Help
            </h3>
            <ul className="space-y-2 text-sm text-gray-300">
              <li><Link href="/account/orders" className="hover:text-white">Track Order</Link></li>
              <li><Link href="/faq" className="hover:text-white">FAQ</Link></li>
              <li><Link href="/returns" className="hover:text-white">Returns</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-flipkart-yellow font-semibold mb-4 uppercase text-sm tracking-wider">
              Policy
            </h3>
            <ul className="space-y-2 text-sm text-gray-300">
              <li><Link href="/privacy" className="hover:text-white">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-white">Terms of Use</Link></li>
              <li><Link href="/shipping" className="hover:text-white">Shipping Policy</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-flipkart-yellow font-semibold mb-4 uppercase text-sm tracking-wider">
              Contact
            </h3>
            <ul className="space-y-2 text-sm text-gray-300">
              <li>Shoe Mafia Store</li>
              <li>UPI: 7587555558-2@ybl</li>
              <li>support@shoemafia.com</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-700 mt-8 pt-8 text-center text-sm text-gray-400">
          <p>&copy; {new Date().getFullYear()} Shoe Mafia. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
