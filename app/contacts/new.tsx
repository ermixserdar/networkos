import {Redirect} from 'expo-router';
/** Kept so existing links to `/contacts/new` still open the combined create/edit form. */
export default function NewContact(){return <Redirect href="/contacts/form"/>}
