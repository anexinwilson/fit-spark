import Image from "next/image"
import Link from "next/link"

const NavBar = () => {
    return  (
        <nav>
        {" "}
        <div>
            <Link href="/">
            <Image src = "/window.svg" width={60} height={60} alt="Logo"/>
            </Link>
        </div>
        <div>

        </div>
        </nav>
    )
}

 export default NavBar