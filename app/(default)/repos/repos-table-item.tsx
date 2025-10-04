import Image from 'next/image'
import { Repo } from './repos-table'
import { ReposProperties } from './repos-properties'

interface ReposTableItemProps {
  repo: Repo
  onCheckboxChange: (id: number, checked: boolean) => void
  isSelected: boolean
}

export default function ReposTableItem({ repo, onCheckboxChange, isSelected }: ReposTableItemProps) {

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {        
    onCheckboxChange(repo.id, e.target.checked)
  }

  const { 
    descriptionOpen,
    setDescriptionOpen,
    statusColor,
    typeIcon,    
  } = ReposProperties()

  return (
    <tbody className="text-sm">
      {/* Row */}
      <tr>
        <td className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap w-px">
          <div className="flex items-center">
            <label className="inline-flex">
              <span className="sr-only">Select</span>
              <input className="form-checkbox" type="checkbox" onChange={handleCheckboxChange} checked={isSelected} />
            </label>
          </div>
        </td>
        <td className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap">
          <div className="flex items-center text-gray-800">
            <div className="w-10 h-10 shrink-0 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-full mr-2 sm:mr-3">
              <Image className="ml-1" src={repo.image} width={20} height={20} alt={repo.order} />
            </div>
            <div className="font-medium text-sky-600">{repo.order}</div>
          </div>
        </td>
        <td className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap">
          <div>{repo.date}</div>
        </td>
        <td className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap">
          <div className="font-medium text-gray-800 dark:text-gray-100">{repo.customer}</div>
        </td>
        <td className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap">
          <div className="text-left font-medium text-green-600">{repo.total}</div>
        </td>
        <td className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap">
          <div className={`inline-flex font-medium rounded-full text-center px-2.5 py-0.5 ${statusColor(repo.status)}`}>{repo.status}</div>
        </td>
        <td className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap">
          <div className="text-center">{repo.items}</div>
        </td>
        <td className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap">
          <div className="text-left">{repo.location}</div>
        </td>
        <td className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap">
          <div className="flex items-center">
            {typeIcon(repo.type)}
            <div>{repo.type}</div>
          </div>
        </td>
        <td className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap w-px">
          <div className="flex items-center">
            <button
              className={`text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400 ${descriptionOpen && 'rotate-180'}`}
              aria-expanded={descriptionOpen}
              onClick={() => setDescriptionOpen(!descriptionOpen)}
              aria-controls={`description-${repo.id}`}
            >
              <span className="sr-only">Menu</span>
              <svg className="w-8 h-8 fill-current" viewBox="0 0 32 32">
                <path d="M16 20l-5.4-5.4 1.4-1.4 4 4 4-4 1.4 1.4z" />
              </svg>
            </button>
          </div>
        </td>
      </tr>
      {/*
      Example of content revealing when clicking the button on the right side:
      Note that you must set a "colSpan" attribute on the <td> element,
      and it should match the number of columns in your table
      */}
      <tr id={`description-${repo.id}`} role="region" className={`${!descriptionOpen && 'hidden'}`}>
        <td colSpan={10} className="px-2 first:pl-5 last:pr-5 py-3">
          <div className="flex items-center bg-gray-50 dark:bg-gray-950/[0.15] dark:text-gray-400 p-3 -mt-3">
            <svg className="shrink-0 fill-current text-gray-400 dark:text-gray-500 mr-2" width="16" height="16">
              <path d="M1 16h3c.3 0 .5-.1.7-.3l11-11c.4-.4.4-1 0-1.4l-3-3c-.4-.4-1-.4-1.4 0l-11 11c-.2.2-.3.4-.3.7v3c0 .6.4 1 1 1zm1-3.6l10-10L13.6 4l-10 10H2v-1.6z" />
            </svg>
            <div className="italic">{repo.description}</div>
          </div>
        </td>
      </tr>
    </tbody>
  )
}