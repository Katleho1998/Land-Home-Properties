import Workspace from './workspace';
import {StaffAuth} from './staff-auth';
import './crm.css';
export const metadata={title:'Workspace | Land & Home',robots:{index:false,follow:false}};
export default function Page(){return <StaffAuth><Workspace/></StaffAuth>}
