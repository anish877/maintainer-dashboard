interface PaginationClassicProps {
  totalItems?: number
  currentPage?: number
  itemsPerPage?: number
}

export default function PaginationClassic({ 
  totalItems = 0, 
  currentPage = 1, 
  itemsPerPage = 10 
}: PaginationClassicProps) {
  const startItem = (currentPage - 1) * itemsPerPage + 1
  const endItem = Math.min(currentPage * itemsPerPage, totalItems)
  
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
      <nav className="mb-4 sm:mb-0 sm:order-1" role="navigation" aria-label="Navigation">
        <ul className="flex justify-center">
          <li className="ml-3 first:ml-0">
            <span className="btn bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700/60 text-gray-300 dark:text-gray-600">&lt;- Previous</span>
          </li>
          <li className="ml-3 first:ml-0">
            <a className="btn bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700/60 hover:border-gray-300 dark:hover:border-gray-600 text-gray-800 dark:text-gray-300" href="#0">Next -&gt;</a>
          </li>
        </ul>
      </nav>
      <div className="text-sm text-gray-500 text-center sm:text-left">
        Showing <span className="font-medium text-gray-600 dark:text-gray-300">{startItem}</span> to <span className="font-medium text-gray-600 dark:text-gray-300">{endItem}</span> of <span className="font-medium text-gray-600 dark:text-gray-300">{totalItems}</span> results
      </div>
    </div>
  )
}